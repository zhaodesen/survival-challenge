import Phaser from 'phaser';
import { PLAYER, ENEMY, BOSS, DEVICES } from '../config/balance.js';

/**
 * BootScene —— 用 Graphics 生成几何色块纹理(占位美术),无需外部资源。
 * 跑通玩法后,这里换成真正的图片加载即可。
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // 生成各类纹理
    this.makeCircle('player', PLAYER.radius, PLAYER.color, 0xffffff, 3);

    Object.entries(ENEMY.types).forEach(([key, t]) => {
      this.makeCircle(`enemy_${key}`, t.radius, t.color, 0x000000, 2);
    });

    this.makeCircle('boss', BOSS.base.radius, BOSS.base.color, 0xffffff, 4);

    // 机关:外圈环 + 内填充
    Object.keys(DEVICES).forEach((key) => {
      const cfg = DEVICES[key];
      if (cfg && typeof cfg === 'object' && cfg.color !== undefined) {
        this.makeDevice(`device_${key}`, DEVICES.baseRadius, cfg.color);
      }
    });

    // 抛射物与粒子
    this.makeCircle('proj_arrow', 5, 0xeaffa0, 0x000000, 1);
    this.makeCircle('proj_thunder', 7, 0xd8b6ff, 0xffffff, 1);
    this.makeWhitePixel('pixel', 6);
    this.makeRing('ring', 60);

    this.scene.start('Start');
  }

  makeCircle(key, radius, fill, line, lineWidth) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillCircle(radius + lineWidth, radius + lineWidth, radius);
    if (lineWidth > 0) {
      g.lineStyle(lineWidth, line, 1);
      g.strokeCircle(radius + lineWidth, radius + lineWidth, radius);
    }
    const size = (radius + lineWidth) * 2;
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeDevice(key, radius, color) {
    const g = this.add.graphics();
    const c = radius;
    // 外圈
    g.lineStyle(5, color, 1);
    g.strokeCircle(c, c, radius - 4);
    // 内填充(半透明感用较暗的同色)
    g.fillStyle(color, 0.22);
    g.fillCircle(c, c, radius - 8);
    // 中心点
    g.fillStyle(color, 0.9);
    g.fillCircle(c, c, 7);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  makeWhitePixel(key, size) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, size, size);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeRing(key, radius) {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(radius, radius, radius - 4);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }
}
