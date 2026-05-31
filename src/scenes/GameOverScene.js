import Phaser from 'phaser';
import audio from '../systems/AudioManager.js';
import { COLORS, FONTS } from '../config/theme.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(stats) {
    const { width: W, height: H } = this.scale;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.rectangle(cx, H / 2, W, H, 0x05080d, 0.72);

    // 网格底纹
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.grid, 1);
    for (let x = 0; x <= W; x += 48) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 48) g.lineBetween(0, y, W, y);
    this.add.image(cx, H * 0.28, 'arena_glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setTint(COLORS.danger).setScale(W / 512 * 1.2);

    this.add.text(cx, H * 0.16, 'SIGNAL LOST', {
      fontFamily: FONTS.mono, fontSize: '16px', color: COLORS.dangerCss
    }).setOrigin(0.5).setLetterSpacing(8);
    const title = this.add.text(cx, H * 0.27, '挑战结束', {
      fontFamily: FONTS.title, fontSize: '72px', color: COLORS.textCss
    }).setOrigin(0.5);
    title.setShadow(0, 0, COLORS.dangerCss, 22, true, true);

    const m = Math.floor(stats.time / 60);
    const s = stats.time % 60;
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

    // 成绩面板
    const panel = this.add.rectangle(cx, H * 0.56, 460, 250, COLORS.panel, 0.7).setStrokeStyle(1, COLORS.frame);
    const rows = [
      ['存活时间', timeStr],
      ['到达关数', `第 ${stats.wave} 关`],
      ['击杀数', `${stats.kills}`],
      ['击败 BOSS', `${stats.bossKills}`],
      ['金币', `${stats.coins}`],
      ['最终得分', `${stats.score}`]
    ];
    const top = panel.y - 100; const rowH = 38;
    rows.forEach((r, i) => {
      const isScore = i === rows.length - 1;
      this.add.text(cx - 190, top + i * rowH, r[0], {
        fontFamily: FONTS.display, fontSize: '18px', color: '#9fb6cc'
      }).setOrigin(0, 0.5);
      this.add.text(cx + 190, top + i * rowH, r[1], {
        fontFamily: FONTS.mono, fontSize: isScore ? '24px' : '20px', color: isScore ? COLORS.goldCss : COLORS.textCss
      }).setOrigin(1, 0.5);
    });

    // 再来一局
    const btn = this.add.container(cx, H * 0.86);
    const bg = this.add.rectangle(0, 0, 280, 60, COLORS.cyan, 0.14)
      .setStrokeStyle(2, COLORS.cyan).setInteractive({ useHandCursor: true });
    const bt = this.add.text(0, 0, '↻  再来一局', { fontFamily: FONTS.display, fontSize: '30px', fontStyle: '700', color: COLORS.cyanCss }).setOrigin(0.5);
    btn.add([bg, bt]);
    this.tweens.add({ targets: bg, alpha: 0.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    bg.on('pointerover', () => bt.setColor('#ffffff'));
    bg.on('pointerout', () => bt.setColor(COLORS.cyanCss));
    bg.on('pointerdown', () => {
      audio.resume();
      this.scene.start('Game');
      this.scene.launch('UI');
    });
  }
}
