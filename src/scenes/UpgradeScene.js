import Phaser from 'phaser';
import { UPGRADE, DEVICES } from '../config/balance.js';

/**
 * UpgradeScene —— 机关升级弹框(覆盖在 Game 之上,暂停游戏)。
 * 展示升级后的能力,以及按钮「100金币 升级」。
 */
export default class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  init(data) {
    this.device = data.device;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.game_ = this.scene.get('Game');

    // 暂停游戏与 HUD
    this.scene.pause('Game');
    this.scene.pause('UI');

    // 半透明遮罩(拦截点击)
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setInteractive();

    // 面板
    const pw = 600; const ph = 460;
    this.add.rectangle(W / 2, H / 2, pw, ph, 0x141a26, 0.98).setStrokeStyle(3, this.device.cfg.color);

    const cx = W / 2;
    const top = H / 2 - ph / 2;

    this.titleText = this.add.text(cx, top + 26, '', {
      fontSize: '30px', fontStyle: 'bold', color: '#ffffff'
    }).setOrigin(0.5);

    this.descText = this.add.text(cx, top + 64, DEVICES.info[this.device.type].desc, {
      fontSize: '15px', color: '#9fb0c4', align: 'center', wordWrap: { width: pw - 70 }
    }).setOrigin(0.5, 0);

    // 列标题
    this.add.text(cx - 110, top + 130, '当前', { fontSize: '17px', color: '#aab6c6' }).setOrigin(0.5);
    this.add.text(cx + 70, top + 130, '升级后', { fontSize: '17px', color: '#49e07a' }).setOrigin(0.5);

    // 动态内容(属性行 + 金币 + 按钮)
    this.dyn = this.add.container(0, 0);

    // 升级按钮
    this.btnBg = this.add.rectangle(cx, top + ph - 86, 280, 56, 0x4fd1ff).setInteractive({ useHandCursor: true });
    this.btnText = this.add.text(cx, top + ph - 86, '', { fontSize: '24px', fontStyle: 'bold', color: '#0b0e14' }).setOrigin(0.5);
    this.btnBg.on('pointerdown', () => this.tryUpgrade());

    // 关闭按钮
    const closeBg = this.add.rectangle(cx, top + ph - 30, 160, 40, 0x2a3446).setInteractive({ useHandCursor: true });
    this.add.text(cx, top + ph - 30, '关闭', { fontSize: '18px', color: '#dfe7f0' }).setOrigin(0.5);
    closeBg.on('pointerdown', () => this.close());

    // 右上角 ✕
    const x = this.add.text(cx + pw / 2 - 22, top + 18, '✕', { fontSize: '24px', color: '#8aa0bb' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    x.on('pointerdown', () => this.close());

    this.coinFloat = this.add.text(cx, top + ph - 122, '', { fontSize: '16px', color: '#ffd24a' }).setOrigin(0.5);

    this.render();
  }

  render() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;
    const top = H / 2 - 230;

    this.titleText.setText(`${this.device.displayName()}   Lv.${this.device.level}${this.device.isMaxLevel ? ' (满级)' : ''}`);

    this.dyn.removeAll(true);

    const curRows = this.device.statRows(this.device.level);
    const nextRows = this.device.isMaxLevel ? null : this.device.statRows(this.device.level + 1);
    const startY = top + 160;
    const lineH = 34;

    curRows.forEach((r, i) => {
      const y = startY + i * lineH;
      this.dyn.add(this.add.text(cx - 250, y, r.label, { fontSize: '17px', color: '#cdd8e6' }).setOrigin(0, 0.5));
      this.dyn.add(this.add.text(cx - 110, y, r.text, { fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0.5));
      if (nextRows) {
        this.dyn.add(this.add.text(cx - 20, y, '→', { fontSize: '16px', color: '#6b7a90' }).setOrigin(0.5));
        this.dyn.add(this.add.text(cx + 70, y, nextRows[i].text, { fontSize: '17px', fontStyle: 'bold', color: '#49e07a' }).setOrigin(0.5, 0.5));
      }
    });

    this.coinFloat.setText(`持有金币:${this.game_.coins}`);

    // 按钮状态
    if (this.device.isMaxLevel) {
      this.btnText.setText('已满级');
      this.btnBg.setFillStyle(0x44506a);
    } else {
      this.btnText.setText(`${UPGRADE.cost}金币 升级`);
      const ok = this.game_.coins >= UPGRADE.cost;
      this.btnBg.setFillStyle(ok ? 0x4fd1ff : 0x44506a);
    }
  }

  tryUpgrade() {
    if (this.device.isMaxLevel) return;
    if (this.game_.coins < UPGRADE.cost) {
      this.coinFloat.setText(`金币不足!需要 ${UPGRADE.cost}(当前 ${this.game_.coins})`).setColor('#ff6b6b');
      this.tweens.add({ targets: this.coinFloat, alpha: 0.3, duration: 120, yoyo: true, repeat: 2 });
      return;
    }
    this.game_.coins -= UPGRADE.cost;
    this.device.upgrade();
    this.coinFloat.setColor('#ffd24a');
    this.cameras.main.flash(150, 80, 200, 255);
    this.render();
  }

  close() {
    this.scene.resume('Game');
    this.scene.resume('UI');
    this.scene.stop();
  }
}
