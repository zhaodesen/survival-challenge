import audio from '../systems/AudioManager.js';
import { COLORS, FONTS } from '../config/theme.js';
import { addScoreRecord } from '../systems/ScoreRecords.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(stats) {
    const { width: W, height: H } = this.scale;
    const cx = W / 2;

    this.cameras.main.setBackgroundColor(0x120b12);
    this.coverImage('gameover_bg', cx, H / 2, W, H).setDepth(-4);
    this.add.rectangle(cx, H / 2, W, H, 0x130915, 0.28).setDepth(-3);
    this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.22).setDepth(-2);

    this.add.text(cx, H * 0.13, 'ARENA FALLEN', {
      fontFamily: FONTS.mono, fontSize: '16px', color: '#ffb1b8'
    }).setOrigin(0.5).setLetterSpacing(6);
    const title = this.add.text(cx, H * 0.24, '挑战结束', {
      fontFamily: FONTS.title, fontSize: '76px', color: '#fff3ef'
    }).setOrigin(0.5);
    title.setShadow(0, 6, '#7a1724', 14, true, true);

    const m = Math.floor(stats.time / 60);
    const s = stats.time % 60;
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
    if (!stats.recordSaved) {
      addScoreRecord(stats);
      stats.recordSaved = true;
    }

    // 成绩面板
    const panel = this.add.rectangle(cx, H * 0.56, 480, 260, 0x1d2028, 0.72).setStrokeStyle(2, 0xff8a3d, 0.65);
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
        fontFamily: FONTS.display, fontSize: '18px', color: '#d4c4be'
      }).setOrigin(0, 0.5);
      this.add.text(cx + 190, top + i * rowH, r[1], {
        fontFamily: FONTS.mono, fontSize: isScore ? '24px' : '20px', color: isScore ? COLORS.goldCss : '#fff3ef'
      }).setOrigin(1, 0.5);
    });

    const btnW = 280;
    const btnH = 58;
    const firstBtnY = Math.min(H * 0.82, H - 128);
    const { bg: retryBg, text: retryText } = this.createButton(cx, firstBtnY, btnW, btnH, '↻  再来一局', 0xff8a3d, '#21120b');
    const { bg: homeBg, text: homeText } = this.createButton(cx, firstBtnY + 74, btnW, btnH, '返回首页', 0x122d38, '#bff8ff');

    retryBg.on('pointerover', () => retryText.setColor('#ffffff'));
    retryBg.on('pointerout', () => retryText.setColor('#21120b'));
    retryBg.on('pointerdown', () => {
      audio.resume();
      audio.startMusic();
      this.scene.start('Game');
      this.scene.launch('UI');
    });

    homeBg.on('pointerover', () => homeText.setColor('#ffffff'));
    homeBg.on('pointerout', () => homeText.setColor('#bff8ff'));
    homeBg.on('pointerdown', () => {
      audio.resume();
      this.scene.stop('UI');
      this.scene.start('Start');
    });
  }

  createButton(x, y, w, h, label, fill, color) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, fill, 0.88)
      .setStrokeStyle(3, 0xfff3d0, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: FONTS.display, fontSize: '28px', fontStyle: '700', color
    }).setOrigin(0.5);
    container.add([bg, text]);
    return { container, bg, text };
  }

  coverImage(key, x, y, W, H) {
    const img = this.add.image(x, y, key);
    img.setScale(Math.max(W / img.width, H / img.height));
    return img;
  }
}
