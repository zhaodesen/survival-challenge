import Phaser from 'phaser';
import { PLAYER, ENEMY, BOSS, DEVICES, FIRE, PICKUPS } from '../config/balance.js';

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
    this.makeFragment('fragment', FIRE.fragmentRadius, FIRE.fragmentColor);

    // 各类碎片(火焰/金币堆/增益)
    Object.entries(PICKUPS.meta).forEach(([kind, m]) => {
      this.makeFragment(`pk_${kind}`, PICKUPS.pickupRadius, m.color);
    });
    // 可拾取金币
    this.makeCoin('coin', PICKUPS.coinGrid.radius);

    // 低血量血色渐晕(中心透明、边缘最深)
    this.makeVignette('vignette');

    // 竞技场中心辉光(径向青色,ADD 混合)
    this.makeRadialGlow('arena_glow', 512, '70,230,255');

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

  makeFragment(key, radius, color) {
    const g = this.add.graphics();
    const c = radius + 2;
    // 四角星形火焰碎片
    g.fillStyle(color, 1);
    const pts = [];
    const spikes = 4;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (Math.PI * i) / spikes - Math.PI / 2;
      const rr = i % 2 === 0 ? radius : radius * 0.45;
      pts.push({ x: c + Math.cos(ang) * rr, y: c + Math.sin(ang) * rr });
    }
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffe7a0, 1);
    g.fillCircle(c, c, radius * 0.32);
    g.generateTexture(key, c * 2, c * 2);
    g.destroy();
  }

  makeRadialGlow(key, size, rgb) {
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, `rgba(${rgb},0.5)`);
    grad.addColorStop(0.4, `rgba(${rgb},0.16)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  makeVignette(key) {
    const w = this.scale.width;
    const h = this.scale.height;
    const tex = this.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    const cx = w / 2; const cy = h / 2;
    const inner = Math.min(w, h) * 0.22;
    const outer = Math.hypot(w, h) * 0.62;
    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, 'rgba(200,0,0,0)');
    grad.addColorStop(0.55, 'rgba(190,0,0,0.18)');
    grad.addColorStop(1, 'rgba(140,0,0,0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  makeCoin(key, radius) {
    const g = this.add.graphics();
    const c = radius + 2;
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(c, c, radius);
    g.lineStyle(2, 0xb8860b, 1);
    g.strokeCircle(c, c, radius);
    g.fillStyle(0xfff0b0, 1);
    g.fillCircle(c - radius * 0.3, c - radius * 0.3, radius * 0.3);
    g.generateTexture(key, c * 2, c * 2);
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
