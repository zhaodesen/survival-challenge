import Phaser from 'phaser';
import audio from '../systems/AudioManager.js';
import { COLORS, FONTS } from '../config/theme.js';
import { formatRecordTime, getScoreRecords } from '../systems/ScoreRecords.js';

/**
 * StartScene —— 卡通动漫轻科幻竞技场开场界面。点击/触摸进入战场。
 */
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    const { width: W, height: H } = this.scale;
    const left = Math.max(54, W * 0.08);

    this.cameras.main.setBackgroundColor(0x1b3540);
    const bgImage = this.coverImage('start_bg', W / 2, H / 2, W, H).setDepth(-4);
    const scrimLayer = this.drawTextScrim(W, H);
    const arenaFrame = this.drawArenaFrame(W, H);

    const tag = this.add.text(left, H * 0.14, 'LIGHT SCI-FI ARENA', {
      fontFamily: FONTS.mono, fontSize: '17px', color: '#bff8ff'
    }).setOrigin(0, 0.5).setAlpha(0).setLetterSpacing(3);

    const titleChars = this.createTitleChars(left, H * 0.24, '生存挑战');

    const sub = this.add.text(left + 4, H * 0.37, '踏入竞技场,用机关和技能挡住敌潮。', {
      fontFamily: FONTS.display, fontSize: '22px', color: '#e8fbff'
    }).setOrigin(0, 0.5).setAlpha(0);

    const line = this.add.rectangle(left + 120, H * 0.43, 240, 4, 0xffa83d).setAlpha(0).setOrigin(0.5);

    const btnW = 292; const btnH = 62;
    const { container: btn, bg: btnBg, text: btnText } = this.createButton(
      left + btnW / 2, H * 0.58, btnW, btnH, '▶  进入战场', 0x1fd6ee, '#062530', 28
    );
    btn.setAlpha(0);

    const { container: recordBtn, bg: recordBg, text: recordText } = this.createButton(
      left + btnW / 2, H * 0.70, btnW, btnH, '我的记录', 0x122d38, '#bff8ff', 28
    );
    recordBtn.setAlpha(0);

    const revealUp = (obj, delay, dy = 16) => {
      obj.y += dy;
      this.tweens.add({ targets: obj, alpha: obj.alpha === 0 ? 1 : obj.alpha, y: obj.y - dy, delay, duration: 520, ease: 'Cubic.out' });
    };
    const fadeIn = (obj, delay) => {
      this.tweens.add({ targets: obj, alpha: 1, delay, duration: 420, ease: 'Cubic.out' });
    };
    const flyTitle = (obj, fromX, targetX, delay) => {
      const brakeX = targetX + (fromX < targetX ? 28 : -28);
      obj.setX(fromX);
      this.tweens.add({
        targets: obj,
        alpha: 1,
        x: brakeX,
        delay,
        duration: 620,
        ease: 'Cubic.out',
        onComplete: () => {
          this.tweens.add({
            targets: obj,
            x: targetX,
            duration: 180,
            ease: 'Back.out'
          });
        }
      });
    };

    revealUp(tag, 120, 10);
    titleChars.forEach((char, i) => {
      const targetX = char.x;
      const fromX = W + 80;
      flyTitle(char, fromX, targetX, 210 + i * 55);
    });
    revealUp(sub, 660, 28);
    revealUp(line, 760, 10);
    fadeIn(btn, 900);
    fadeIn(recordBtn, 980);

    const transitionTargets = [tag, sub, line, btn, recordBtn, arenaFrame, ...titleChars];
    const start = () => this.playStartTransition({
      bgImage,
      scrimLayer,
      transitionTargets,
      buttons: [btnBg, recordBg],
      W,
      H
    });
    btnBg.on('pointerover', () => btnText.setColor('#ffffff'));
    btnBg.on('pointerout', () => btnText.setColor('#062530'));
    btnBg.on('pointerdown', start);

    recordBg.on('pointerover', () => recordText.setColor('#ffffff'));
    recordBg.on('pointerout', () => recordText.setColor('#bff8ff'));
    recordBg.on('pointerdown', () => {
      audio.resume();
      this.showRecordsOverlay();
    });
  }

  createButton(x, y, w, h, label, fill, color, fontSize) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, fill, 0.88)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: FONTS.display, fontSize: `${fontSize}px`, fontStyle: '700', color
    }).setOrigin(0.5);
    container.add([bg, text]);
    return { container, bg, text };
  }

  createTitleChars(x, y, title) {
    const chars = [];
    let cursor = x;
    [...title].forEach((char) => {
      const text = this.add.text(cursor, y, char, {
        fontFamily: FONTS.title, fontSize: '78px', color: '#ffffff'
      }).setOrigin(0, 0.5).setAlpha(0);
      text.setShadow(0, 5, '#1a5c68', 10, true, true);
      chars.push(text);
      cursor += text.width;
    });
    return chars;
  }

  playStartTransition({ bgImage, scrimLayer, transitionTargets, buttons, W, H }) {
    if (this.isStarting) return;
    this.isStarting = true;

    buttons.forEach((button) => button.disableInteractive());
    this.tweens.killTweensOf(transitionTargets);

    audio.resume();
    audio.startMusic();
    audio.awaken();
    this.prepareGameBehindStart();

    this.tweens.add({
      targets: transitionTargets,
      alpha: 0,
      duration: 240,
      ease: 'Cubic.in'
    });
    this.tweens.add({
      targets: scrimLayer,
      alpha: 0,
      duration: 420,
      delay: 90,
      ease: 'Cubic.out',
      onComplete: () => this.turnStartPage(bgImage, W, H)
    });
  }

  prepareGameBehindStart() {
    if (!this.scene.isActive('Game')) {
      this.scene.launch('Game');
    }
    this.scene.pause('Game');
    this.scene.bringToTop('Start');
  }

  turnStartPage(bgImage, W, H) {
    this.time.delayedCall(34, () => {
      this.game.renderer.snapshotArea(0, 0, W, H, (snapshot) => {
        bgImage.setVisible(false);
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.playEnergyScanTransition(snapshot, W, H);
      }, 'image/png');
    });
  }

  playEnergyScanTransition(snapshot, W, H) {
    const key = `start_scan_${Date.now()}_${Phaser.Math.Between(1000, 9999)}`;
    this.textures.addImage(key, snapshot);

    const oldPage = this.add.image(0, 0, key).setOrigin(0).setDepth(70);
    const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    const mask = maskGfx.createGeometryMask();
    oldPage.setMask(mask);

    const scan = { x: -90 };
    const beamCore = this.add.rectangle(scan.x, H / 2, 18, H, 0xf5ffff, 0.95)
      .setOrigin(0.5)
      .setDepth(82);
    const beamGlow = this.add.rectangle(scan.x, H / 2, 116, H, COLORS.cyan, 0.3)
      .setOrigin(0.5)
      .setDepth(81);
    const revealGlow = this.add.rectangle(0, H / 2, 0, H, COLORS.cyan, 0.12)
      .setOrigin(0, 0.5)
      .setDepth(71);
    const scanLine = this.add.graphics().setDepth(83);

    const drawScan = () => {
      const revealX = Phaser.Math.Clamp(scan.x - 34, 0, W);
      maskGfx.clear();
      maskGfx.fillStyle(0xffffff);
      maskGfx.fillRect(revealX, 0, W - revealX, H);

      beamCore.setX(scan.x);
      beamGlow.setX(scan.x - 12);
      revealGlow.setSize(revealX, H);

      scanLine.clear();
      scanLine.lineStyle(2, 0xffffff, 0.78);
      for (let y = 34; y < H; y += 74) {
        scanLine.lineBetween(scan.x - 82, y, scan.x + 38, y + 22);
      }
      scanLine.lineStyle(1, COLORS.cyan, 0.45);
      for (let y = 18; y < H; y += 52) {
        scanLine.lineBetween(scan.x - 132, y, scan.x - 36, y);
      }
    };

    drawScan();
    this.tweens.add({
      targets: scan,
      x: W + 140,
      duration: 860,
      ease: 'Cubic.inOut',
      onUpdate: drawScan,
      onComplete: () => {
        oldPage.clearMask(true);
        oldPage.destroy();
        beamCore.destroy();
        beamGlow.destroy();
        revealGlow.destroy();
        scanLine.destroy();
        this.textures.remove(key);
        this.scene.resume('Game');
        if (!this.scene.isActive('UI')) this.scene.launch('UI');
        this.scene.stop('Start');
      }
    });
  }

  showRecordsOverlay() {
    if (this.recordsLayer) this.recordsLayer.destroy(true);

    const { width: W, height: H } = this.scale;
    const records = getScoreRecords();
    const layer = this.add.container(0, 0).setDepth(120);
    this.recordsLayer = layer;

    const mask = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.58)
      .setInteractive({ useHandCursor: false });
    const panelW = 660;
    const panelH = 500;
    const panelX = W / 2;
    const panelY = H / 2;
    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x10212b, 0.96)
      .setStrokeStyle(2, COLORS.cyan, 0.72);

    layer.add([mask, panel]);

    layer.add(this.add.text(panelX - panelW / 2 + 36, panelY - panelH / 2 + 38, '我的记录', {
      fontFamily: FONTS.title, fontSize: '38px', color: '#ffffff'
    }).setOrigin(0, 0.5));
    layer.add(this.add.text(panelX - panelW / 2 + 38, panelY - panelH / 2 + 82, '最近 20 局历史得分', {
      fontFamily: FONTS.display, fontSize: '18px', color: '#bff8ff'
    }).setOrigin(0, 0.5));

    const closeBg = this.add.rectangle(panelX + panelW / 2 - 44, panelY - panelH / 2 + 42, 46, 38, 0xff8a3d, 0.9)
      .setStrokeStyle(2, 0xfff3d0, 0.8)
      .setInteractive({ useHandCursor: true });
    const closeText = this.add.text(closeBg.x, closeBg.y - 1, '×', {
      fontFamily: FONTS.display, fontSize: '28px', fontStyle: '700', color: '#21120b'
    }).setOrigin(0.5);
    layer.add([closeBg, closeText]);
    closeBg.on('pointerdown', () => {
      this.recordsLayer.destroy(true);
      this.recordsLayer = null;
    });

    if (records.length === 0) {
      layer.add(this.add.text(panelX, panelY + 18, '暂无历史记录', {
        fontFamily: FONTS.display, fontSize: '28px', color: '#e8fbff'
      }).setOrigin(0.5));
      return;
    }

    const startX = panelX - panelW / 2 + 38;
    const topY = panelY - panelH / 2 + 128;
    const rowH = 40;
    const headers = [
      ['日期', startX],
      ['得分', startX + 214],
      ['时间', startX + 326],
      ['关数', startX + 428],
      ['击杀', startX + 522]
    ];
    headers.forEach(([label, x]) => {
      layer.add(this.add.text(x, topY, label, {
        fontFamily: FONTS.display, fontSize: '16px', color: COLORS.goldCss
      }).setOrigin(0, 0.5));
    });

    records.slice(0, 8).forEach((record, i) => {
      const y = topY + 34 + i * rowH;
      const date = new Date(record.createdAt);
      const dateText = Number.isNaN(date.getTime())
        ? '--'
        : `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const rowBg = this.add.rectangle(panelX, y, panelW - 72, 32, i % 2 === 0 ? 0x17313d : 0x122832, 0.72);
      layer.add(rowBg);
      [
        [dateText, startX, '#e8fbff'],
        [`${record.score}`, startX + 214, COLORS.goldCss],
        [formatRecordTime(record.time), startX + 326, '#e8fbff'],
        [`第 ${record.wave} 关`, startX + 428, '#e8fbff'],
        [`${record.kills}`, startX + 522, '#e8fbff']
      ].forEach(([value, x, color]) => {
        layer.add(this.add.text(x, y, value, {
          fontFamily: FONTS.mono, fontSize: '18px', color
        }).setOrigin(0, 0.5));
      });
    });
  }

  coverImage(key, x, y, W, H) {
    const img = this.add.image(x, y, key);
    img.setScale(Math.max(W / img.width, H / img.height));
    return img;
  }

  drawTextScrim(W, H) {
    const scrimLayer = this.add.container(0, 0).setDepth(-3);
    for (let i = 0; i < 9; i++) {
      const alpha = 0.42 - i * 0.04;
      scrimLayer.add(this.add.rectangle((W * (i + 0.5)) / 9, H / 2, W / 9 + 2, H, 0x07131b, Math.max(0, alpha)));
    }
    scrimLayer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x07131b, 0.12));
    return scrimLayer;
  }

  drawArenaFrame(W, H) {
    const g = this.add.graphics().setDepth(40);
    g.lineStyle(4, 0xffffff, 0.4);
    const m = 22; const c = 54;
    const corner = (x, y, sx, sy) => {
      g.lineBetween(x, y, x + sx * c, y);
      g.lineBetween(x, y, x, y + sy * c);
    };
    corner(m, m, 1, 1);
    corner(W - m, m, -1, 1);
    corner(m, H - m, 1, -1);
    corner(W - m, H - m, -1, -1);
    return g;
  }
}
