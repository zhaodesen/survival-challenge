import Phaser from 'phaser';
import audio from '../systems/AudioManager.js';
import { COLORS, FONTS } from '../config/theme.js';

/**
 * StartScene —— HOLO-ARENA 开场界面。点击/触摸进入战场。
 */
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    const { width: W, height: H } = this.scale;
    const cx = W / 2;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // 背景:网格 + 中心辉光 + 扫描线
    this.drawBackdrop(W, H);

    // 四角战术括号
    this.drawCorners(W, H);

    // 顶部小标识
    const tag = this.add.text(cx, H * 0.13, 'H O L O - A R E N A', {
      fontFamily: FONTS.mono, fontSize: '18px', color: COLORS.cyanCss
    }).setOrigin(0.5).setAlpha(0).setLetterSpacing(8);

    // 主标题
    const title = this.add.text(cx, H * 0.30, '主角生存挑战', {
      fontFamily: FONTS.title, fontSize: '88px', color: COLORS.textCss
    }).setOrigin(0.5).setAlpha(0);
    title.setShadow(0, 0, COLORS.cyanCss, 24, true, true);

    // 标题下危险红装饰线 + 副标题
    const line = this.add.rectangle(cx, H * 0.42, 360, 2, COLORS.danger).setAlpha(0);
    const sub = this.add.text(cx, H * 0.47, 'SURVIVAL PROTOCOL // 全息战术竞技场', {
      fontFamily: FONTS.mono, fontSize: '16px', color: COLORS.mutedCss
    }).setOrigin(0.5).setAlpha(0).setLetterSpacing(2);

    // 战术简报面板
    const panelY = H * 0.62;
    const panel = this.add.rectangle(cx, panelY, 720, 130, COLORS.panel, 0.6)
      .setStrokeStyle(1, COLORS.frame).setAlpha(0);
    const briefTitle = this.add.text(cx - 340, panelY - 50, '▍战术简报', {
      fontFamily: FONTS.display, fontSize: '16px', fontStyle: '600', color: COLORS.cyanCss
    }).setOrigin(0, 0.5).setAlpha(0);
    const tips = [
      '按住屏幕拖动 = 虚拟摇杆,操控角色走位',
      '踩上机关操控它清怪 · 点击机关花金币升级',
      '击败敌人掉落火焰/金币/增益碎片 · 火焰可圈地烧敌',
      '一波波敌潮来袭,每 5 关一个 Boss —— 活得越久越强'
    ];
    const brief = this.add.text(cx - 340, panelY - 22, tips.join('\n'), {
      fontFamily: FONTS.display, fontSize: '17px', color: '#aebfd2', lineSpacing: 9
    }).setOrigin(0, 0).setAlpha(0);

    // 进入按钮(战术框)
    const btnY = H * 0.85;
    const btnW = 300; const btnH = 64;
    const btn = this.add.container(cx, btnY).setAlpha(0);
    const btnBg = this.add.rectangle(0, 0, btnW, btnH, COLORS.cyan, 0.12)
      .setStrokeStyle(2, COLORS.cyan).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(0, 0, '▶  进入战场', {
      fontFamily: FONTS.display, fontSize: '30px', fontStyle: '700', color: COLORS.cyanCss
    }).setOrigin(0.5);
    btn.add([btnBg, btnText]);
    this.tweens.add({ targets: btnBg, alpha: 0.28, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 入场:逐项淡入
    const reveal = (obj, delay, dy = 16) => {
      obj.y += dy;
      this.tweens.add({ targets: obj, alpha: obj.alpha === 0 ? 1 : obj.alpha, y: obj.y - dy, delay, duration: 520, ease: 'Cubic.out' });
    };
    [tag, title, line, sub, panel, briefTitle, brief, btn].forEach((o, i) => reveal(o, 120 + i * 90));

    const start = () => {
      audio.resume();
      audio.awaken();
      this.cameras.main.flash(280, 70, 230, 255);
      this.time.delayedCall(160, () => {
        this.scene.start('Game');
        this.scene.launch('UI');
      });
    };
    btnBg.on('pointerover', () => btnText.setColor('#ffffff'));
    btnBg.on('pointerout', () => btnText.setColor(COLORS.cyanCss));
    btnBg.on('pointerdown', start);
  }

  drawBackdrop(W, H) {
    const g = this.add.graphics().setDepth(-1);
    g.lineStyle(1, COLORS.grid, 1);
    for (let x = 0; x <= W; x += 48) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 48) g.lineBetween(0, y, W, y);

    const glow = this.add.image(W / 2, H * 0.32, 'arena_glow')
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setScale(W / 512 * 1.4);

    // 缓缓下移的扫描线
    const scan = this.add.rectangle(W / 2, 0, W, 3, COLORS.cyan, 0.18);
    this.tweens.add({ targets: scan, y: H, duration: 6000, repeat: -1, ease: 'Sine.inOut' });
  }

  drawCorners(W, H) {
    const g = this.add.graphics().setDepth(40);
    g.lineStyle(2, COLORS.frame, 0.9);
    const m = 22; const c = 40;
    const corner = (x, y, sx, sy) => {
      g.lineBetween(x, y, x + sx * c, y);
      g.lineBetween(x, y, x, y + sy * c);
    };
    corner(m, m, 1, 1);
    corner(W - m, m, -1, 1);
    corner(m, H - m, 1, -1);
    corner(W - m, H - m, -1, -1);
  }
}
