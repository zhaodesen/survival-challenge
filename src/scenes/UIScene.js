import Phaser from 'phaser';

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

    // 左上信息
    this.timeText = this.add.text(20, 16, '', { fontSize: '26px', fontStyle: 'bold', color: '#ffffff' });
    this.statText = this.add.text(20, 50, '', { fontSize: '18px', color: '#aab6c6' });

    // 玩家血条
    this.hpBarBg = this.add.rectangle(20, 88, 260, 20, 0x000000, 0.5).setOrigin(0, 0).setStrokeStyle(2, 0x33405a);
    this.hpBar = this.add.rectangle(22, 90, 256, 16, 0x49e07a).setOrigin(0, 0);
    this.hpText = this.add.text(150, 88, '', { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5, 0);

    // 当前机关提示
    this.deviceText = this.add.text(20, 120, '', { fontSize: '18px', color: '#4fd1ff' });

    // 减速状态
    this.slowText = this.add.text(20, 148, '', { fontSize: '16px', color: '#7fa8ff' });

    // Boss 倒计时(屏幕中上)
    this.bossWarn = this.add.text(W / 2, 90, '', {
      fontSize: '40px', fontStyle: 'bold', color: '#ff3d7f'
    }).setOrigin(0.5).setAlpha(0);

    // Boss 血条(顶部居中)
    this.bossBarBg = this.add.rectangle(W / 2, 30, 600, 22, 0x000000, 0.55).setStrokeStyle(2, 0xff3d7f).setVisible(false);
    this.bossBar = this.add.rectangle(W / 2 - 298, 30, 596, 16, 0xff3d7f).setOrigin(0, 0.5).setVisible(false);
    this.bossLabel = this.add.text(W / 2, 8, '', { fontSize: '15px', color: '#ffd1e0' }).setOrigin(0.5, 0).setVisible(false);

    this.bindEvents();
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
  }

  fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  update() {
    const g = this.game_;
    if (!g || !g.player) return;

    const sec = Math.floor(g.difficulty ? g.difficulty.seconds : 0);
    this.timeText.setText(`⏱ ${this.fmtTime(sec)}`);
    this.statText.setText(`击杀 ${g.kills}   Boss ${g.bossKills}   分数 ${g.score}   难度档 ${g.difficulty.tier}`);

    // 血条
    const p = g.player;
    const ratio = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    this.hpBar.width = 256 * ratio;
    this.hpBar.fillColor = ratio > 0.5 ? 0x49e07a : ratio > 0.25 ? 0xffd166 : 0xff5555;
    this.hpText.setText(`${Math.ceil(p.hp)} / ${p.maxHp}`);

    // 当前机关
    if (g.activeDevice) {
      this.deviceText.setText(`▶ 操控中:${g.activeDevice.displayName()}`);
    } else {
      this.deviceText.setText('（站到机关上以操控）');
    }

    // 减速状态
    if (this.slowEndAt && this.time.now < this.slowEndAt) {
      const r = Math.ceil((this.slowEndAt - this.time.now) / 1000);
      this.slowText.setText(`🐌 全体减速中 ${r}s`);
    } else {
      this.slowText.setText('');
    }

    // Boss 倒计时
    const remain = g.bossManager ? g.bossManager.warnRemain : null;
    if (remain !== null) {
      this.bossWarn.setText(`⚠ BOSS 来袭  ${remain}`).setAlpha(1);
    } else if (!this.currentBoss) {
      this.bossWarn.setAlpha(0);
    }

    // Boss 血条
    if (this.currentBoss && this.currentBoss.active) {
      const br = Phaser.Math.Clamp(this.currentBoss.hp / this.currentBoss.maxHp, 0, 1);
      this.bossBar.width = 596 * br;
    }
  }
}
