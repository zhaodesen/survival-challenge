import Phaser from 'phaser';
import { DEVICES } from '../config/balance.js';

/**
 * SkillSelectScene —— 全机关满级后弹出,让玩家选择 3 项能力作为自身技能。
 */
export default class SkillSelectScene extends Phaser.Scene {
  constructor() {
    super('SkillSelect');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.game_ = this.scene.get('Game');

    this.scene.pause('Game');
    this.scene.pause('UI');

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setInteractive();

    this.add.text(W / 2, H * 0.12, '机关全部满级!', { fontSize: '34px', fontStyle: 'bold', color: '#ff9f43' }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.2, '选择 3 项能力,化为你的专属技能(此后机关消失,技能自动释放)', {
      fontSize: '18px', color: '#cdd8e6'
    }).setOrigin(0.5);

    this.types = DEVICES.introOrder.slice();   // ['bow','cannon','laser','thunder','slow']
    this.selected = [];

    const n = this.types.length;
    const cardW = 210; const gap = 18;
    const totalW = n * cardW + (n - 1) * gap;
    const startX = W / 2 - totalW / 2 + cardW / 2;
    const cy = H * 0.52;

    this.cards = this.types.map((type, i) => {
      const x = startX + i * (cardW + gap);
      const info = DEVICES.info[type];
      const cfg = DEVICES[type];
      const bg = this.add.rectangle(x, cy, cardW, 260, 0x141a26, 0.98).setStrokeStyle(3, 0x33405a).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x, cy - 70, `device_${type}`).setScale(1.4);
      const name = this.add.text(x, cy - 8, info.name, { fontSize: '22px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      const desc = this.add.text(x, cy + 24, info.desc, { fontSize: '13px', color: '#9fb0c4', align: 'center', wordWrap: { width: cardW - 28 } }).setOrigin(0.5, 0);
      const card = { type, bg, icon, name, desc, color: cfg.color };
      bg.on('pointerdown', () => this.toggle(card));
      return card;
    });

    this.counter = this.add.text(W / 2, H * 0.78, '已选 0 / 3', { fontSize: '22px', color: '#aab6c6' }).setOrigin(0.5);

    this.confirmBg = this.add.rectangle(W / 2, H * 0.88, 280, 56, 0x44506a).setInteractive({ useHandCursor: true });
    this.confirmText = this.add.text(W / 2, H * 0.88, '选满 3 项', { fontSize: '24px', fontStyle: 'bold', color: '#0b0e14' }).setOrigin(0.5);
    this.confirmBg.on('pointerdown', () => this.confirm());
  }

  toggle(card) {
    const idx = this.selected.indexOf(card.type);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
      card.bg.setStrokeStyle(3, 0x33405a);
    } else {
      if (this.selected.length >= 3) return;
      this.selected.push(card.type);
      card.bg.setStrokeStyle(4, card.color);
    }
    this.counter.setText(`已选 ${this.selected.length} / 3`);
    const ready = this.selected.length === 3;
    this.confirmBg.setFillStyle(ready ? 0x4fd1ff : 0x44506a);
    this.confirmText.setText(ready ? '确定' : '选满 3 项');
  }

  confirm() {
    if (this.selected.length !== 3) return;
    this.game_.enterSkillMode(this.selected.slice());
    this.scene.resume('Game');
    this.scene.resume('UI');
    this.scene.stop();
  }
}
