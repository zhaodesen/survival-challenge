import Phaser from 'phaser';
import audio from '../systems/AudioManager.js';
import { WORLD } from '../config/balance.js';
import { COLORS, FONTS } from '../config/theme.js';

/**
 * UIScene —— HUD 叠加层(不随镜头移动)。读取 GameScene 状态绘制。
 */
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game');
    const W = this.scale.width;
    const H = this.scale.height;

    // 低血量血色渐晕(全屏覆盖,平时隐藏;置于 HUD 之下,世界之上)
    this.vignette = this.add.image(W / 2, H / 2, 'vignette')
      .setDepth(-10).setAlpha(0).setScrollFactor(0);

    // 左上圆形小地图
    this.createMinimap();

    // 信息区(右移到小地图右侧)
    const hx = 196;
    this.timeText = this.add.text(hx, 14, '', { fontFamily: FONTS.mono, fontSize: '28px', color: COLORS.textCss });
    this.statText = this.add.text(hx, 50, '', { fontFamily: FONTS.display, fontSize: '17px', color: '#9fb6cc' });

    // 金币(屏幕顶部居中)
    this.coinText = this.add.text(W / 2, 54, '', {
      fontFamily: FONTS.mono, fontSize: '26px', color: COLORS.goldCss, stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5, 0);

    // 连杀显示(金币下方)
    this.comboText = this.add.text(W / 2, 92, '', {
      fontFamily: FONTS.display, fontSize: '26px', fontStyle: '700', color: COLORS.amberCss, stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5, 0).setAlpha(0);

    // 玩家血条
    this.hpBarBg = this.add.rectangle(hx, 88, 260, 18, 0x000000, 0.5).setOrigin(0, 0).setStrokeStyle(1, COLORS.frame);
    this.hpBar = this.add.rectangle(hx + 2, 90, 256, 14, COLORS.green).setOrigin(0, 0);
    this.hpText = this.add.text(hx + 130, 86, '', { fontFamily: FONTS.mono, fontSize: '14px', color: COLORS.textCss }).setOrigin(0.5, 0);

    // 当前机关提示
    this.deviceText = this.add.text(hx, 116, '', { fontFamily: FONTS.display, fontSize: '17px', color: COLORS.cyanCss });

    // 减速 / 火焰 / 增益状态
    this.slowText = this.add.text(hx, 144, '', { fontFamily: FONTS.display, fontSize: '15px', color: '#7fa8ff' });
    this.fireText = this.add.text(hx, 167, '', { fontFamily: FONTS.display, fontSize: '15px', color: COLORS.amberCss });
    this.buffText = this.add.text(hx, 190, '', { fontFamily: FONTS.display, fontSize: '14px', color: '#ffe08a' });

    // 关卡横幅(屏幕中部偏上)
    this.banner = this.add.text(W / 2, this.scale.height * 0.34, '', {
      fontFamily: FONTS.title, fontSize: '52px', color: COLORS.textCss, align: 'center'
    }).setOrigin(0.5).setAlpha(0);

    // 右侧技能图标(技能阶段才显示,点击打开技能升级)
    this.skillIcon = this.add.container(W - 56, this.scale.height / 2).setDepth(50).setVisible(false);
    const iconBg = this.add.circle(0, 0, 38, COLORS.panel, 0.95).setStrokeStyle(3, COLORS.gold).setInteractive({ useHandCursor: true });
    const iconStar = this.add.image(0, -4, 'pk_atkUp').setScale(1.1);
    const iconTxt = this.add.text(0, 22, '技能', { fontFamily: FONTS.display, fontSize: '13px', color: COLORS.goldCss }).setOrigin(0.5);
    this.skillIcon.add([iconBg, iconStar, iconTxt]);
    iconBg.on('pointerdown', () => { if (this.game_.openSkillUpgrade) this.game_.openSkillUpgrade(); });
    this.tweens.add({ targets: this.skillIcon, scale: 1.08, duration: 700, yoyo: true, repeat: -1 });

    // 机关教学提示面板(底部居中,数秒后淡出)
    this.tutorialBox = this.add.container(W / 2, this.scale.height - 70).setAlpha(0);
    this.tutorialBg = this.add.rectangle(0, 0, 760, 78, COLORS.panel, 0.95).setStrokeStyle(1, COLORS.cyan);
    this.tutorialTitle = this.add.text(0, -20, '', { fontFamily: FONTS.display, fontSize: '20px', fontStyle: '700', color: COLORS.cyanCss }).setOrigin(0.5);
    this.tutorialDesc = this.add.text(0, 8, '', { fontFamily: FONTS.display, fontSize: '15px', color: '#cdd8e6', align: 'center', wordWrap: { width: 720 } }).setOrigin(0.5);
    this.tutorialBox.add([this.tutorialBg, this.tutorialTitle, this.tutorialDesc]);

    // Boss 倒计时(屏幕中上)
    this.bossWarn = this.add.text(W / 2, 88, '', {
      fontFamily: FONTS.display, fontSize: '40px', fontStyle: '700', color: COLORS.dangerCss
    }).setOrigin(0.5).setAlpha(0);

    // Boss 血条(顶部居中)
    this.bossBarBg = this.add.rectangle(W / 2, 30, 600, 20, 0x000000, 0.55).setStrokeStyle(1, COLORS.danger).setVisible(false);
    this.bossBar = this.add.rectangle(W / 2 - 298, 30, 596, 14, COLORS.danger).setOrigin(0, 0.5).setVisible(false);
    this.bossLabel = this.add.text(W / 2, 6, '', { fontFamily: FONTS.mono, fontSize: '15px', color: '#ffd1e0' }).setOrigin(0.5, 0).setVisible(false);

    this.bindEvents();
  }

  // ---------- 圆形小地图 ----------
  createMinimap() {
    this.mm = { cx: 92, cy: 92, r: 72 };
    const { cx, cy, r } = this.mm;

    // 背景圆 + 边框
    this.add.circle(cx, cy, r, 0x0a0e16, 0.7).setStrokeStyle(3, 0x33405a);

    // 动态层(每帧重绘:机关、敌人、Boss、主角)
    this.miniDyn = this.add.graphics();

    // 圆形遮罩,超出小地图圆的点会被裁掉
    const maskG = this.make.graphics({ x: 0, y: 0, add: false });
    maskG.fillStyle(0xffffff);
    maskG.fillCircle(cx, cy, r - 2);
    this.miniDyn.setMask(maskG.createGeometryMask());

    // 标题
    this.add.text(cx, cy + r + 4, '地图', { fontSize: '12px', color: '#6b7a90' }).setOrigin(0.5, 0);
  }

  // 世界坐标 -> 小地图坐标
  worldToMini(wx, wy) {
    const { cx, cy, r } = this.mm;
    const mx = cx + (wx / WORLD.width - 0.5) * 2 * r;
    const my = cy + (wy / WORLD.height - 0.5) * 2 * r;
    return { mx, my };
  }

  updateMinimap() {
    const g = this.game_;
    if (!g || !this.miniDyn) return;
    const { cx, cy, r } = this.mm;
    const gfx = this.miniDyn;
    gfx.clear();

    // 敌人:小红点
    const enemies = g.spawnManager ? g.spawnManager.group.getChildren() : [];
    gfx.fillStyle(0xff6b6b, 0.9);
    for (const e of enemies) {
      if (!e.active) continue;
      const { mx, my } = this.worldToMini(e.x, e.y);
      gfx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // 机关:按各自颜色的圆点
    if (g.devices) {
      for (const d of g.devices) {
        const { mx, my } = this.worldToMini(d.x, d.y);
        gfx.fillStyle(d.cfg.color, 1);
        gfx.fillCircle(mx, my, 3.5);
        // 激活中加白圈高亮
        if (d.activated) {
          gfx.lineStyle(1.5, 0xffffff, 1);
          gfx.strokeCircle(mx, my, 5.5);
        }
      }
    }

    // 掉落道具碎片:按各自颜色;金币:金色点
    if (g.dropSystem) {
      g.dropSystem.items.getChildren().forEach((f) => {
        if (!f.active) return;
        const { mx, my } = this.worldToMini(f.x, f.y);
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(mx, my, 3);
      });
      gfx.fillStyle(0xffd24a, 1);
      g.dropSystem.coins.getChildren().forEach((c) => {
        if (!c.active) return;
        const { mx, my } = this.worldToMini(c.x, c.y);
        gfx.fillRect(mx - 1, my - 1, 2, 2);
      });
    }

    // Boss:粉色大点
    if (g.waveManager && g.waveManager.hasBoss) {
      const b = g.waveManager.boss;
      const { mx, my } = this.worldToMini(b.x, b.y);
      gfx.fillStyle(0xff3d7f, 1);
      gfx.fillCircle(mx, my, 4.5);
    }

    // 主角:青色点(超出圆边时夹在边缘上,始终可见)
    if (g.player && g.player.alive) {
      let { mx, my } = this.worldToMini(g.player.x, g.player.y);
      const dx = mx - cx; const dy = my - cy;
      const dist = Math.hypot(dx, dy);
      const lim = r - 4;
      if (dist > lim) { mx = cx + (dx / dist) * lim; my = cy + (dy / dist) * lim; }
      gfx.fillStyle(0x4fd1ff, 1);
      gfx.fillCircle(mx, my, 4);
      gfx.lineStyle(1.5, 0xffffff, 1);
      gfx.strokeCircle(mx, my, 4);
    }
  }

  bindEvents() {
    const ev = this.game_.events;
    ev.on('boss-warning', (sec) => {
      this.bossWarn.setAlpha(1);
    });
    ev.on('boss-spawned', (boss, idx) => {
      this.bossWarn.setAlpha(0);
      this.currentBoss = boss;
      this.bossIndex = idx;
      this.bossBarBg.setVisible(true);
      this.bossBar.setVisible(true);
      this.bossLabel.setVisible(true).setText(`BOSS #${idx}`);
      audio.boss();
      this.cameras.main.shake(260, 0.006);
    });
    const hideBoss = () => {
      this.currentBoss = null;
      this.bossBarBg.setVisible(false);
      this.bossBar.setVisible(false);
      this.bossLabel.setVisible(false);
    };
    ev.on('boss-defeated', hideBoss);

    ev.on('slow-triggered', (dur) => {
      this.slowEndAt = this.time.now + dur;
    });

    // 关卡事件
    ev.on('wave-start', (wave, isBoss) => {
      const txt = isBoss ? `第 ${wave} 关 · BOSS 关` : `第 ${wave} 关`;
      this.showBanner(txt, isBoss ? '#ff3d7f' : '#4fd1ff');
    });
    ev.on('wave-clear', (wave) => {
      this.showBanner(`第 ${wave} 关 完成!`, '#49e07a');
      audio.waveclear();
      this.cameras.main.flash(220, 60, 200, 90);
    });

    // 金币增加:计数器弹一下 + 飘 "+n"
    ev.on('coins-gained', (n) => {
      this.tweens.killTweensOf(this.coinText);
      this.coinText.setScale(1).setScale(1.28);
      this.tweens.add({ targets: this.coinText, scale: 1, duration: 200, ease: 'Back.out' });
      const fx = this.add.text(this.coinText.x + 64, 60, `+${n}`, { fontSize: '18px', fontStyle: 'bold', color: '#ffe08a', stroke: '#000', strokeThickness: 3 }).setOrigin(0, 0);
      this.tweens.add({ targets: fx, y: 40, alpha: 0, duration: 600, onComplete: () => fx.destroy() });
    });

    // 连杀
    ev.on('combo', (n) => {
      if (n >= 2) {
        this.comboText.setText(`连杀 x${n}`).setAlpha(1).setScale(1.3);
        this.tweens.killTweensOf(this.comboText);
        this.tweens.add({ targets: this.comboText, scale: 1, duration: 180, ease: 'Back.out' });
      } else {
        this.tweens.add({ targets: this.comboText, alpha: 0, duration: 250 });
      }
    });

    // 火焰事件
    ev.on('fire-on', () => { this.fireOn = true; });
    ev.on('fire-off', () => { this.fireOn = false; });
    ev.on('area-captured', (n) => {
      if (n > 0) this.showBanner(`🔥 烧死 ${n} 个!`, '#ff7a18', 800);
    });

    // 拾取道具提示
    ev.on('pickup', (name, color) => {
      const hex = `#${(color >>> 0).toString(16).padStart(6, '0')}`;
      this.showBanner(`获得:${name}`, hex, 700);
      audio.pickup();
    });

    // 新机关教学
    ev.on('device-introduced', (type, name, desc) => {
      this.tutorialTitle.setText(`🆕 新机关:${name}`);
      this.tutorialDesc.setText(desc);
      this.tweens.killTweensOf(this.tutorialBox);
      this.tutorialBox.setAlpha(1);
      this.tweens.add({ targets: this.tutorialBox, alpha: 0, delay: 6000, duration: 800 });
    });

    // 机关满级里程碑:全屏清屏爆发
    ev.on('milestone', (index, total) => {
      this.showBanner(`机关满级 ${index}/${total} · 全屏爆发!`, '#ffd24a', 1000);
    });

    // 进入技能阶段
    ev.on('skill-mode-on', () => {
      this.skillIcon.setVisible(true);
      this.tutorialTitle.setText('⚡ 技能已觉醒!');
      this.tutorialDesc.setText('机关已消失,技能自动释放。点击右侧图标花金币升级技能。之后每关都是 Boss!');
      this.tweens.killTweensOf(this.tutorialBox);
      this.tutorialBox.setAlpha(1);
      this.tweens.add({ targets: this.tutorialBox, alpha: 0, delay: 7000, duration: 800 });
    });
  }

  showBanner(text, color, hold = 1100) {
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, scale: 1.15, delay: hold, duration: 500 });
  }

  fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  buildBuffText(g) {
    const now = this.time.now;
    const parts = [];
    if (now < g.timeStopUntil) parts.push(`⏸ 时停 ${Math.ceil((g.timeStopUntil - now) / 1000)}s`);
    if (now < g.invincibleUntil) parts.push(`🛡 无敌 ${Math.ceil((g.invincibleUntil - now) / 1000)}s`);
    if (now < g.damageMulUntil) parts.push(`⚔ 攻击↑ ${Math.ceil((g.damageMulUntil - now) / 1000)}s`);
    if (now < g.enemyDefUntil) parts.push(`🪓 敌防↓ ${Math.ceil((g.enemyDefUntil - now) / 1000)}s`);
    if (now < g.enemyAtkUntil) parts.push(`🩹 敌攻↓ ${Math.ceil((g.enemyAtkUntil - now) / 1000)}s`);
    return parts.join('   ');
  }

  update() {
    const g = this.game_;
    if (!g || !g.player) return;

    this.updateMinimap();

    const sec = Math.floor(g.difficulty ? g.difficulty.seconds : 0);
    const wave = g.waveManager ? g.waveManager.wave : 0;
    const remainEnemies = g.waveManager ? g.waveManager.remaining : 0;
    this.timeText.setText(`⏱ ${this.fmtTime(sec)}   第 ${wave} 关`);
    this.statText.setText(`本关剩余 ${remainEnemies}   击杀 ${g.kills}   分数 ${g.score}`);
    this.coinText.setText(`🪙 ${g.coins}`);

    // 血条
    const p = g.player;
    const ratio = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.hpBar.width = 256 * ratio;
    this.hpBar.fillColor = ratio > 0.5 ? 0x49e07a : ratio > 0.25 ? 0xffd166 : 0xff5555;
    this.hpText.setText(`${Math.ceil(p.hp)} / ${p.maxHp}`);

    // 低血量(<20%)血色翻红,越低越深 + 轻微脉动 + 心跳声
    if (p.alive && ratio < 0.2) {
      const t = 1 - ratio / 0.2;                       // 0→1 随血量降低
      const pulse = 0.88 + 0.12 * Math.sin(this.time.now / 180);
      this.vignette.setAlpha(Phaser.Math.Clamp(0.25 + t * 0.75, 0, 1) * pulse);
      audio.heartbeat();
    } else {
      this.vignette.setAlpha(0);
    }

    // 当前机关 / 技能状态
    if (g.skillMode) {
      this.deviceText.setText('⚡ 技能自动释放中');
    } else if (g.activeDevice) {
      this.deviceText.setText(`▶ 操控中:${g.activeDevice.displayName()}`);
    } else {
      this.deviceText.setText('（进入机关光圈连接操控;点击机关升级)');
    }

    // 减速状态
    if (this.slowEndAt && this.time.now < this.slowEndAt) {
      const r = Math.ceil((this.slowEndAt - this.time.now) / 1000);
      this.slowText.setText(`🐌 全体减速中 ${r}s`);
    } else {
      this.slowText.setText('');
    }

    // 火焰状态(一次性:移动圈地,闭合即烧一次)
    if (g.fireSystem && g.fireSystem.active) {
      this.fireText.setText('🔥 火焰待发 · 移动圈一圈烧敌');
    } else {
      this.fireText.setText('');
    }

    // 增益状态汇总
    this.buffText.setText(this.buildBuffText(g));

    // Boss 倒计时(每秒蜂鸣)
    const remain = g.waveManager ? g.waveManager.warnRemain : null;
    if (remain !== null) {
      this.bossWarn.setText(`⚠ BOSS 来袭  ${remain}`).setAlpha(1);
      if (remain !== this._lastWarnSec) { this._lastWarnSec = remain; audio.warn(); }
    } else {
      this._lastWarnSec = null;
      if (!this.currentBoss) this.bossWarn.setAlpha(0);
    }

    // Boss 血条
    if (this.currentBoss && this.currentBoss.active) {
      const br = Phaser.Math.Clamp(this.currentBoss.hp / this.currentBoss.maxHp, 0, 1);
      this.bossBar.width = 596 * br;
    }
  }
}
