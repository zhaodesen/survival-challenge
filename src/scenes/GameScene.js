import Phaser from 'phaser';
import Player from '../entities/Player.js';
import DifficultyManager from '../systems/DifficultyManager.js';
import SpawnManager from '../systems/SpawnManager.js';
import BossManager from '../systems/BossManager.js';
import { DEVICE_CLASSES } from '../devices/index.js';
import { WORLD, DEVICES, SCORE } from '../config/balance.js';

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
    this.activeSlowUntil = 0;
    this.gameOver = false;

    // 玩家
    this.player = new Player(this, WORLD.width / 2, WORLD.height / 2);
    this.player.once('died', () => this.handleGameOver());

    // 镜头
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    // 系统
    this.difficulty = new DifficultyManager();
    this.spawnManager = new SpawnManager(this, this.difficulty);
    this.bossManager = new BossManager(this, this.difficulty);

    // 机关
    this.devices = [];
    DEVICES.layout.forEach((d) => {
      const Cls = DEVICE_CLASSES[d.type];
      if (Cls) this.devices.push(new Cls(this, d.x, d.y));
    });

    // 抛射物(弓箭)
    this.arrows = [];
    this.fx = this.add.graphics().setDepth(9);

    // 碰撞:玩家 vs 敌人 / Boss
    this.physics.add.overlap(this.player, this.spawnManager.group, this.onPlayerHit, null, this);
    this.physics.add.overlap(this.player, this.bossManager.group, this.onPlayerHit, null, this);

    this.setupInput();

    // 通知 UI 场景获取本场景引用
    this.events.emit('game-started');
  }

  // ---------- 背景 ----------
  drawBackground() {
    this.cameras.main.setBackgroundColor(WORLD.bgColor);
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(WORLD.bgColor, 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.lineStyle(1, WORLD.gridColor, 1);
    const step = 100;
    for (let x = 0; x <= WORLD.width; x += step) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += step) g.lineBetween(0, y, WORLD.width, y);
    // 地图边界
    g.lineStyle(6, 0x33405a, 1);
    g.strokeRect(0, 0, WORLD.width, WORLD.height);
  }

  // ---------- 输入(键盘 + 移动端摇杆) ----------
  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT'
    });

    this.joy = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, pointerId: -1 };
    const maxR = 70;

    this.input.on('pointerdown', (p) => {
      // 仅在屏幕左半部分启用摇杆,避免与右侧 UI 冲突
      if (p.x < this.scale.width / 2 && !this.joy.active) {
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
    let vx = 0; let vy = 0;
    const k = this.keys;
    if (k.left.isDown || k.leftA.isDown) vx -= 1;
    if (k.right.isDown || k.rightA.isDown) vx += 1;
    if (k.up.isDown || k.upA.isDown) vy -= 1;
    if (k.down.isDown || k.downA.isDown) vy += 1;
    if (this.joy.active) { vx += this.joy.dx; vy += this.joy.dy; }
    this.player.setMove(vx, vy);
  }

  // ---------- 主循环 ----------
  update(time, delta) {
    if (this.gameOver) return;

    this.readInput();
    this.difficulty.update(delta);
    this.spawnManager.update(time, delta);
    this.bossManager.update(time, delta);

    // 机关激活判定:取玩家所在范围内最近的一个机关
    this.updateDeviceActivation(time);
    this.devices.forEach((d) => d.update(time, delta));

    this.updateArrows(time, delta);
  }

  updateDeviceActivation(time) {
    const px = this.player.x; const py = this.player.y;
    let nearest = null; let bestD = Infinity;
    const r = DEVICES.baseRadius + 4;
    for (const d of this.devices) {
      const dist = Phaser.Math.Distance.Squared(px, py, d.x, d.y);
      if (dist <= r * r && dist < bestD) { bestD = dist; nearest = d; }
    }
    for (const d of this.devices) {
      d.setActivated(d === nearest, time);
    }
    this.activeDevice = nearest;
  }

  // ---------- 战斗 ----------
  getHostiles() {
    const list = this.spawnManager.group.getChildren().filter((e) => e.active);
    if (this.bossManager.hasBoss) list.push(this.bossManager.boss);
    return list;
  }

  damageHostile(target, amount) {
    if (!target.active) return;
    const dead = target.takeDamage(amount);
    if (dead) {
      if (target.isBoss) this.onBossKilled(target);
      else this.onEnemyKilled(target);
    }
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.score += SCORE.perKill;
    this.fxDeath(enemy.x, enemy.y, enemy.tintTopLeft);
    enemy.deactivate();
  }

  onBossKilled(boss) {
    this.bossKills += 1;
    this.score += SCORE.perBossKill;
    this.cameras.main.flash(300, 255, 220, 120);
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 90, () => this.fxExplosion(
        boss.x + Phaser.Math.Between(-30, 30),
        boss.y + Phaser.Math.Between(-30, 30), 70, 0xff3d7f));
    }
    this.bossManager.clearBoss();
    this.events.emit('boss-defeated');
  }

  onPlayerHit(player, enemy) {
    if (!enemy.active || !player.alive) return;
    const now = this.time.now;
    if (now - enemy.lastContact < enemy.contactCd) return;
    enemy.lastContact = now;
    player.takeDamage(enemy.atk, now);
  }

  // ---------- 弓箭抛射物 ----------
  fireArrow(x, y, target, damage, speed) {
    const img = this.add.image(x, y, 'proj_arrow').setDepth(12);
    this.arrows.push({ img, target, damage, speed, life: 0, lastX: target.x, lastY: target.y });
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
  }

  fxDeath(x, y, color) {
    const c = this.add.circle(x, y, 18, 0xffffff, 0.8).setDepth(11).setScale(0.3);
    this.tweens.add({ targets: c, scale: 1, alpha: 0, duration: 220, onComplete: () => c.destroy() });
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
        kills: this.kills,
        bossKills: this.bossKills,
        score: this.score
      };
      this.scene.stop('UI');
      this.scene.start('GameOver', stats);
    });
  }
}
