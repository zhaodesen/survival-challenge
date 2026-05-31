import Phaser from 'phaser';
import Player from '../entities/Player.js';
import DifficultyManager from '../systems/DifficultyManager.js';
import SpawnManager from '../systems/SpawnManager.js';
import WaveManager from '../systems/WaveManager.js';
import FireSystem from '../systems/FireSystem.js';
import DropSystem from '../systems/DropSystem.js';
import SkillSystem from '../systems/SkillSystem.js';
import audio from '../systems/AudioManager.js';
import { DEVICE_CLASSES } from '../devices/index.js';
import { WORLD, DEVICES, SCORE, PICKUPS } from '../config/balance.js';
import { COLORS } from '../config/theme.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.drawBackground();

    // 状态
    this.kills = 0;
    this.bossKills = 0;
    this.score = 0;
    this.coins = 0;
    this.gameOver = false;

    // 反馈系统:连杀 + 飘字计数 + 顿帧
    this.combo = 0;
    this.comboExpire = 0;
    this._dmgTextCount = 0;
    this._hitstopTimer = null;
    this.maxedMilestone = 0;   // 已庆祝过的满级机关数

    // 全局增益/减益(由道具碎片驱动)
    this.activeSlowUntil = 0;     // 全体减速结束时间
    this.damageMul = 1;           // 我方输出倍率(攻击提升)
    this.damageMulUntil = 0;
    this.enemyDefMul = 1;         // 敌人防御倍率(减防御)
    this.enemyDefUntil = 0;
    this.enemyAtkMul = 1;         // 敌人攻击倍率(降攻击)
    this.enemyAtkUntil = 0;
    this.invincibleUntil = 0;     // 无敌结束时间
    this.timeStopUntil = 0;       // 时间停止结束时间

    // 玩家
    this.player = new Player(this, WORLD.width / 2, WORLD.height / 2);
    this.player.once('died', () => this.handleGameOver());

    // 镜头
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    // 系统
    this.boss = null;
    this.difficulty = new DifficultyManager();
    this.spawnManager = new SpawnManager(this, this.difficulty);
    this.waveManager = new WaveManager(this, this.difficulty);

    // 机关(随机位置;前几关每关引入一种,用于教学)
    this.devices = [];
    this.activeDevice = null;
    this.events.on('wave-start', this.onWaveStartDevices, this);

    // 火焰圈地系统 + 掉落道具系统(需在 player 之后创建)
    this.fireSystem = new FireSystem(this);
    this.dropSystem = new DropSystem(this);

    // 技能系统(后期:全机关满级后启用)
    this.skills = new SkillSystem(this);
    this.skillMode = false;
    this.skillSelectOffered = false;

    // 抛射物(弓箭)
    this.arrows = [];
    this.fx = this.add.graphics().setDepth(9);
    this.enemyHpGfx = this.add.graphics().setDepth(11);  // 敌人血条层

    // 碰撞:玩家 vs 敌人 / Boss
    this.physics.add.overlap(this.player, this.spawnManager.group, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.waveManager.group, this.onPlayerHit, null, this);

    this.setupInput();

    // 通知 UI 场景获取本场景引用
    this.events.emit('game-started');
  }

  // ---------- 机关管理 ----------
  /** 每关开头:前 introOrder.length 关各引入一种新机关(教学) */
  onWaveStartDevices(wave) {
    const order = DEVICES.introOrder;
    if (wave >= 1 && wave <= order.length) {
      this.introduceDevice(order[wave - 1]);
    }
  }

  introduceDevice(type) {
    const Cls = DEVICE_CLASSES[type];
    if (!Cls) return;
    // 开局即爽:第一个机关刷在玩家脚边,无需找路
    const pos = this.devices.length === 0 ? this.nearDevicePosition() : this.randomDevicePosition();
    const dev = new Cls(this, pos.x, pos.y);
    this.devices.push(dev);
    // 出现反馈 + 教学提示
    const ring = this.add.circle(pos.x, pos.y, DEVICES.baseRadius, dev.cfg.color, 0.4).setDepth(6);
    this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
    const info = DEVICES.info[type];
    this.events.emit('device-introduced', type, info.name, info.desc, pos.x, pos.y);
  }

  /** 玩家脚边一小段距离(开局首个机关用) */
  nearDevicePosition() {
    const m = DEVICES.spawnMargin;
    const px = this.player.x; const py = this.player.y;
    const ang = Math.random() * Math.PI * 2;
    const dist = 110;
    const x = Phaser.Math.Clamp(px + Math.cos(ang) * dist, m, WORLD.width - m);
    const y = Phaser.Math.Clamp(py + Math.sin(ang) * dist, m, WORLD.height - m);
    return { x, y };
  }

  /** 随机生成一个不与现有机关/玩家太近、且远离边缘的机关位置 */
  randomDevicePosition() {
    const m = DEVICES.spawnMargin;
    const px = this.player ? this.player.x : WORLD.width / 2;
    const py = this.player ? this.player.y : WORLD.height / 2;
    let best = { x: WORLD.width / 2, y: WORLD.height / 2 };
    for (let tries = 0; tries < 40; tries++) {
      const x = Phaser.Math.Between(m, WORLD.width - m);
      const y = Phaser.Math.Between(m, WORLD.height - m);
      if (Phaser.Math.Distance.Between(x, y, px, py) < DEVICES.minPlayerDist) continue;
      let okDist = true;
      for (const d of this.devices) {
        if (Phaser.Math.Distance.Between(x, y, d.x, d.y) < DEVICES.minDistBetween) { okDist = false; break; }
      }
      if (okDist) return { x, y };
      best = { x, y };
    }
    return best;
  }

  /** 打开机关升级弹框(暂停游戏) */
  openUpgrade(device) {
    if (this.gameOver) return;
    if (this.scene.isActive('Upgrade')) return;
    // 取消摇杆,避免暂停后残留
    this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0; this.joy.pointerId = -1;
    this.hideJoystick();
    this.scene.launch('Upgrade', { device });
  }


  // ---------- 背景(HOLO-ARENA 战术网格) ----------
  drawBackground() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(COLORS.bg, 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);

    // 细网格(50)
    g.lineStyle(1, COLORS.grid, 1);
    const fine = 50;
    for (let x = 0; x <= WORLD.width; x += fine) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += fine) g.lineBetween(0, y, WORLD.width, y);
    // 主网格(250,更亮)
    g.lineStyle(1.5, COLORS.gridBright, 1);
    const major = 250;
    for (let x = 0; x <= WORLD.width; x += major) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += major) g.lineBetween(0, y, WORLD.width, y);

    // 中心径向辉光(场地"扫描"中心感)
    const glow = this.add.image(WORLD.width / 2, WORLD.height / 2, 'arena_glow')
      .setDepth(0).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    glow.setScale(WORLD.width / glow.width * 1.1);

    // 战术边框:双线 + 四角标记
    g.lineStyle(2, COLORS.frame, 1);
    g.strokeRect(6, 6, WORLD.width - 12, WORLD.height - 12);
    g.lineStyle(4, COLORS.cyan, 0.5);
    const c = 60;
    [[0, 0, 1, 1], [WORLD.width, 0, -1, 1], [0, WORLD.height, 1, -1], [WORLD.width, WORLD.height, -1, -1]]
      .forEach(([cx, cy, sx, sy]) => {
        g.lineBetween(cx + sx * 6, cy + sy * 6, cx + sx * (6 + c), cy + sy * 6);
        g.lineBetween(cx + sx * 6, cy + sy * 6, cx + sx * 6, cy + sy * (6 + c));
      });
  }

  // ---------- 输入(移动端虚拟摇杆,全屏任意位置按下即出现) ----------
  setupInput() {
    this.joy = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, pointerId: -1 };
    const maxR = 90;

    this.input.on('pointerdown', (p, currentlyOver) => {
      // 点击到机关(可交互对象)时不触发摇杆,交给升级逻辑
      if (currentlyOver && currentlyOver.length > 0) return;
      if (!this.joy.active) {
        this.joy.active = true;
        this.joy.pointerId = p.id;
        this.joy.baseX = p.x;
        this.joy.baseY = p.y;
        this.showJoystick(p.x, p.y);
      }
    });

    this.input.on('pointermove', (p) => {
      if (this.joy.active && p.id === this.joy.pointerId) {
        let dx = p.x - this.joy.baseX;
        let dy = p.y - this.joy.baseY;
        const len = Math.hypot(dx, dy);
        if (len > maxR) { dx = dx / len * maxR; dy = dy / len * maxR; }
        this.joy.dx = dx / maxR;
        this.joy.dy = dy / maxR;
        if (this.joyThumb) this.joyThumb.setPosition(this.joy.baseX + dx, this.joy.baseY + dy);
      }
    });

    const release = (p) => {
      if (this.joy.active && p.id === this.joy.pointerId) {
        this.joy.active = false;
        this.joy.dx = 0; this.joy.dy = 0;
        this.joy.pointerId = -1;
        this.hideJoystick();
      }
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  showJoystick(x, y) {
    if (!this.joyBase) {
      this.joyBase = this.add.image(0, 0, 'ring').setScrollFactor(0).setDepth(1000)
        .setAlpha(0.35).setScale(1.4);
      this.joyThumb = this.add.image(0, 0, 'pixel').setScrollFactor(0).setDepth(1001)
        .setTint(0x4fd1ff).setAlpha(0.7).setScale(6);
    }
    this.joyBase.setPosition(x, y).setVisible(true);
    this.joyThumb.setPosition(x, y).setVisible(true);
  }
  hideJoystick() {
    if (this.joyBase) this.joyBase.setVisible(false);
    if (this.joyThumb) this.joyThumb.setVisible(false);
  }

  readInput() {
    if (this.joy.active) {
      this.player.setMove(this.joy.dx, this.joy.dy);
    } else {
      this.player.setMove(0, 0);
    }
  }

  // ---------- 主循环 ----------
  update(time, delta) {
    if (this.gameOver) return;

    this.readInput();
    this.difficulty.update(delta);
    this.waveManager.update(time, delta);
    this.fireSystem.update(time, delta);
    this.dropSystem.update(time, delta);
    this.expireBuffs(time);

    // 连杀超时重置
    if (this.combo > 0 && time > this.comboExpire) {
      this.combo = 0;
      this.events.emit('combo', 0);
    }

    if (this.skillMode) {
      this.skills.update(time, delta);
    } else {
      // 机关激活判定 + 满级里程碑 + 全机关满级检测
      this.updateDeviceActivation(time);
      this.devices.forEach((d) => d.update(time, delta));
      this.checkDeviceMilestones();
      this.checkAllDevicesMaxed();
    }

    this.updateArrows(time, delta);
    this.drawEnemyHealthBars();
  }

  /** 每升满一个机关 → 全屏清屏爆发(里程碑高潮) */
  checkDeviceMilestones() {
    const maxedNow = this.devices.reduce((n, d) => n + (d.isMaxLevel ? 1 : 0), 0);
    while (this.maxedMilestone < maxedNow) {
      this.maxedMilestone += 1;
      this.milestoneBurst(this.maxedMilestone);
    }
  }

  /** 全屏清屏爆发:震屏闪光 + 扩散冲击波 + 清场,共 5 次(对应 5 个机关) */
  milestoneBurst(index) {
    const p = this.player;
    const total = DEVICES.introOrder.length;
    this.cameras.main.flash(450, 255, 240, 180);
    this.cameras.main.shake(360, 0.014);
    this.hitstop(120);
    audio.boom();
    this.time.delayedCall(40, () => audio.maxlevel());

    // 扩散冲击波(覆盖全屏)
    const ring = this.add.image(p.x, p.y, 'ring').setTint(0xffd24a).setDepth(20).setScale(0.3).setAlpha(0.95);
    this.tweens.add({ targets: ring, scale: 18, alpha: 0, duration: 620, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    const ring2 = this.add.image(p.x, p.y, 'ring').setTint(0xffffff).setDepth(20).setScale(0.2).setAlpha(0.8);
    this.tweens.add({ targets: ring2, scale: 14, alpha: 0, duration: 480, ease: 'Cubic.out', delay: 60, onComplete: () => ring2.destroy() });

    // 清屏:普通敌人秒杀,Boss 受 15% 最大生命
    const hostiles = this.getHostiles();
    for (const h of hostiles) {
      if (h.isBoss) {
        this.damageHostile(h, h.maxHp * 0.15);
      } else {
        this.fxExplosion(h.x, h.y, 38, 0xffd24a);
        this.damageHostile(h, h.hp + h.def + 1);   // 恰好致命,飘字显示真实数值
      }
    }

    this.events.emit('milestone', index, total);
  }

  /** 全部机关满级 → 弹出技能选择(延迟,让最后一次爆发先演) */
  checkAllDevicesMaxed() {
    if (this.skillSelectOffered) return;
    if (this.devices.length < DEVICES.introOrder.length) return;
    if (!this.devices.every((d) => d.isMaxLevel)) return;
    if (this.scene.isActive('Upgrade')) return;   // 等升级弹框关闭后再弹
    this.skillSelectOffered = true;
    this.time.delayedCall(1200, () => { if (!this.gameOver) this.scene.launch('SkillSelect'); });
  }

  /** 进入技能阶段:角色获得 3 项技能,机关消失,之后每关 Boss */
  enterSkillMode(types) {
    this.skillMode = true;
    types.forEach((t) => this.skills.addSkill(t));
    this.devices.forEach((d) => d.destroy());
    this.devices = [];
    this.activeDevice = null;
    audio.awaken();
    this.cameras.main.flash(400, 255, 220, 120);
    this.events.emit('skill-mode-on', types);
  }

  /** 打开技能升级弹框(右侧图标点击) */
  openSkillUpgrade() {
    if (this.gameOver || !this.skillMode) return;
    if (this.scene.isActive('SkillUpgrade')) return;
    this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0; this.joy.pointerId = -1;
    this.hideJoystick();
    this.scene.launch('SkillUpgrade');
  }

  /** 在每个受伤敌人头顶绘制血条 */
  drawEnemyHealthBars() {
    const g = this.enemyHpGfx;
    g.clear();
    const w = 28; const h = 4;
    const enemies = this.spawnManager.group.getChildren();
    for (const e of enemies) {
      if (!e.active || e.hp >= e.maxHp) continue;
      const ratio = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
      const x = e.x - w / 2;
      const y = e.y - (e.radius || 12) - 12;
      g.fillStyle(0x000000, 0.6);
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      const col = ratio > 0.5 ? 0x49e07a : ratio > 0.25 ? 0xffd166 : 0xff5555;
      g.fillStyle(col, 1);
      g.fillRect(x, y, w * ratio, h);
    }
  }

  /** Boss 技能对玩家造成伤害(尊重无敌/时停) */
  tryDamagePlayer(amount) {
    const now = this.time.now;
    if (now < this.timeStopUntil) return;
    if (now < this.invincibleUntil) return;
    this.player.takeDamage(amount, now);
  }

  expireBuffs(time) {
    if (time > this.damageMulUntil) this.damageMul = 1;
    if (time > this.enemyDefUntil) this.enemyDefMul = 1;
    if (time > this.enemyAtkUntil) this.enemyAtkMul = 1;
  }

  // ---------- 道具效果 ----------
  addCoins(n) {
    this.coins += n;
    audio.coin();
    this.events.emit('coins-gained', n);
  }

  applyMassSlow(factor, dur) {
    const until = this.time.now + dur;
    this.activeSlowUntil = until;
    this.spawnManager.applySlowAll(factor, until);
    if (this.waveManager.hasBoss) this.waveManager.boss.applySlow(factor, until);
  }

  applyEnemyDefDown(factor, dur) {
    this.enemyDefMul = factor;
    this.enemyDefUntil = this.time.now + dur;
  }

  applyEnemyAtkDown(factor, dur) {
    this.enemyAtkMul = factor;
    this.enemyAtkUntil = this.time.now + dur;
  }

  applyAtkUp(mul, dur) {
    this.damageMul = mul;
    this.damageMulUntil = this.time.now + dur;
  }

  applyInvincible(dur) {
    this.invincibleUntil = this.time.now + dur;
    this.player.setTint(0xfff27a);
    this.time.delayedCall(dur, () => { if (this.player.active) this.player.clearTint(); });
  }

  applyTimeStop(dur) {
    this.timeStopUntil = this.time.now + dur;
    this.cameras.main.flash(160, 150, 220, 255);
  }

  killRandomEnemies(count) {
    const enemies = this.spawnManager.group.getChildren().filter((e) => e.active);
    Phaser.Utils.Array.Shuffle(enemies);
    const n = Math.min(count, enemies.length);
    for (let i = 0; i < n; i++) {
      this.fxExplosion(enemies[i].x, enemies[i].y, 36, 0xff4d4d);
      this.damageHostile(enemies[i], enemies[i].hp + enemies[i].def + 1);
    }
  }

  updateDeviceActivation(time) {
    const px = this.player.x; const py = this.player.y;
    let nearest = null; let bestD = Infinity;
    const r = DEVICES.baseRadius + 4;
    // 只在"非满级"机关里找玩家正在踩的那个
    for (const d of this.devices) {
      if (d.isMaxLevel) continue;
      const dist = Phaser.Math.Distance.Squared(px, py, d.x, d.y);
      if (dist <= r * r && dist < bestD) { bestD = dist; nearest = d; }
    }
    for (const d of this.devices) {
      // 满级机关:自动攻击,常驻激活;其余:玩家踩中才激活
      d.setActivated(d.isMaxLevel || d === nearest, time);
    }
    this.activeDevice = nearest;
  }

  // ---------- 战斗 ----------
  getHostiles() {
    const list = this.spawnManager.group.getChildren().filter((e) => e.active);
    if (this.waveManager.hasBoss) list.push(this.waveManager.boss);
    return list;
  }

  damageHostile(target, amount) {
    if (!target.active) return;
    const real = amount * this.damageMul;
    const dead = target.takeDamage(real);
    // 命中反馈:飘字(过滤激光每帧小额)+ 命中音
    if (real >= 8 || target.isBoss) {
      this.spawnDamageText(target.x, target.y, real, target.isBoss);
      audio.hit();
    }
    if (dead) {
      if (target.isBoss) this.onBossKilled(target);
      else this.onEnemyKilled(target);
    }
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.score += SCORE.perKill;
    this.coins += PICKUPS.coinPerKill;
    this.fxDeath(enemy.x, enemy.y, enemy.tintTopLeft || 0xffffff);
    audio.kill();
    this.bumpCombo();
    const x = enemy.x; const y = enemy.y;
    enemy.deactivate();
    this.dropSystem.rollDrop(x, y);
    this.events.emit('coins-gained', PICKUPS.coinPerKill);
  }

  onBossKilled(boss) {
    this.bossKills += 1;
    this.score += SCORE.perBossKill;
    this.cameras.main.flash(300, 255, 220, 120);
    this.cameras.main.shake(260, 0.012);
    this.hitstop(90);
    audio.boom();
    this.time.delayedCall(60, () => audio.boss());
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 90, () => this.fxExplosion(
        boss.x + Phaser.Math.Between(-30, 30),
        boss.y + Phaser.Math.Between(-30, 30), 70, 0xff3d7f));
    }
    this.waveManager.clearBoss();
    this.events.emit('boss-defeated');
  }

  onPlayerHit(player, enemy) {
    if (!enemy.active || !player.alive) return;
    const now = this.time.now;
    // 时间停止 / 无敌期间不受接触伤害
    if (now < this.timeStopUntil) return;
    if (now < this.invincibleUntil) return;
    if (now - enemy.lastContact < enemy.contactCd) return;
    enemy.lastContact = now;
    const before = player.hp;
    player.takeDamage(enemy.atk * this.enemyAtkMul, now);
    if (player.hp < before) { audio.hurt(); this.hitstop(50); }
  }

  // ---------- 反馈:连杀 / 飘字 / 顿帧 ----------
  bumpCombo() {
    this.combo += 1;
    this.comboExpire = this.time.now + 2500;
    this.events.emit('combo', this.combo);
  }

  spawnDamageText(x, y, amount, isBoss) {
    if (this._dmgTextCount > 36) return;   // 性能保护:同屏飘字上限
    const n = Math.round(amount);
    let color = '#ffffff'; let size = 18;
    if (isBoss) { color = '#ff8a3d'; size = 26; }
    else if (n >= 80) { color = '#ffd24a'; size = 24; }
    else if (n >= 30) { color = '#ffe08a'; size = 20; }
    const t = this.add.text(x + Phaser.Math.Between(-6, 6), y - 10, `${n}`, {
      fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(30);
    this._dmgTextCount += 1;
    this.tweens.add({
      targets: t, y: y - 46, alpha: 0, scale: 1.15, duration: 560, ease: 'Quad.out',
      onComplete: () => { t.destroy(); this._dmgTextCount -= 1; }
    });
  }

  /** 顿帧:短暂暂停物理,强化打击感 */
  hitstop(ms) {
    if (this.gameOver) return;
    this.physics.world.pause();
    if (this._hitstopTimer) this._hitstopTimer.remove(false);
    this._hitstopTimer = this.time.delayedCall(ms, () => {
      if (!this.gameOver) this.physics.world.resume();
    });
  }

  // ---------- 弓箭抛射物 ----------
  fireArrow(x, y, target, damage, speed) {
    const img = this.add.image(x, y, 'proj_arrow').setDepth(12);
    this.arrows.push({ img, target, damage, speed, life: 0, lastX: target.x, lastY: target.y });
    audio.shoot();
  }

  updateArrows(time, delta) {
    const dt = delta / 1000;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life += delta;
      let tx; let ty;
      if (a.target && a.target.active) { tx = a.target.x; ty = a.target.y; a.lastX = tx; a.lastY = ty; }
      else { tx = a.lastX; ty = a.lastY; }

      const ang = Math.atan2(ty - a.img.y, tx - a.img.x);
      a.img.rotation = ang;
      a.img.x += Math.cos(ang) * a.speed * dt;
      a.img.y += Math.sin(ang) * a.speed * dt;

      const reached = Phaser.Math.Distance.Between(a.img.x, a.img.y, tx, ty) < 14;
      if (reached || a.life > 2000) {
        if (a.target && a.target.active && reached) {
          this.damageHostile(a.target, a.damage);
        }
        a.img.destroy();
        this.arrows.splice(i, 1);
      }
    }
  }

  // ---------- 特效 ----------
  fxExplosion(x, y, radius, color) {
    const c = this.add.circle(x, y, radius, color, 0.6).setDepth(11).setScale(0.2);
    this.tweens.add({
      targets: c, scale: 1, alpha: 0, duration: 280, ease: 'Quad.out',
      onComplete: () => c.destroy()
    });
    audio.boom();
  }

  fxTelegraph(x, y, radius, color, delay, onDone) {
    const ring = this.add.circle(x, y, radius, color, 0.12).setDepth(7)
      .setStrokeStyle(3, color, 0.7);
    this.tweens.add({
      targets: ring, alpha: 0.4, duration: delay, yoyo: false,
      onComplete: () => { ring.destroy(); if (onDone) onDone(); }
    });
  }

  fxLightning(x1, y1, x2, y2, color, alpha = 0.9) {
    const g = this.add.graphics().setDepth(11);
    g.lineStyle(3, color, alpha);
    // 折线闪电
    const segs = 5;
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = Phaser.Math.Linear(x1, x2, t) + Phaser.Math.Between(-10, 10);
      const my = Phaser.Math.Linear(y1, y2, t) + Phaser.Math.Between(-10, 10);
      g.lineTo(mx, my);
    }
    g.lineTo(x2, y2);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    audio.zap();
  }

  /** 击杀粒子迸溅(替代旧白圈),更有"脆"感 */
  fxDeath(x, y, color) {
    const ring = this.add.circle(x, y, 16, 0xffffff, 0.85).setDepth(11).setScale(0.3);
    this.tweens.add({ targets: ring, scale: 1.1, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
    const shards = 6;
    for (let i = 0; i < shards; i++) {
      const a = (Math.PI * 2 * i) / shards + Math.random() * 0.5;
      const dist = 18 + Math.random() * 22;
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), color, 1).setDepth(11);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist,
        alpha: 0, scale: 0.4, duration: 260 + Math.random() * 120, ease: 'Quad.out',
        onComplete: () => p.destroy()
      });
    }
  }

  // ---------- 结束 ----------
  handleGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.physics.pause();
    this.cameras.main.shake(300, 0.01);
    this.time.delayedCall(700, () => {
      const stats = {
        time: Math.floor(this.difficulty.seconds),
        wave: this.waveManager.wave,
        kills: this.kills,
        bossKills: this.bossKills,
        coins: this.coins,
        score: this.score
      };
      this.scene.stop('UI');
      this.scene.start('GameOver', stats);
    });
  }
}
