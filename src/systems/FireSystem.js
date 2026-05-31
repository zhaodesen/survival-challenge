import Phaser from 'phaser';
import { FIRE } from '../config/balance.js';

/**
 * FireSystem —— 火焰圈地(一次性)。
 * 由 DropSystem 在拾取火焰碎片时调用 activateFire() 进入火焰模式(无时间限制)。
 * 移动留下火焰轨迹,轨迹自交闭合即把围住区域染红、烧死区域内所有敌人;
 * 完成一次圈地烧杀后火焰模式自动结束(一次性)。
 */
export default class FireSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.trail = [];

    this.trailGfx = scene.add.graphics().setDepth(13);
  }

  activateFire() {
    const p = this.scene.player;
    this.active = true;
    this.trail = [{ x: p.x, y: p.y }];
    // 脚下火焰爆发反馈
    this.scene.cameras.main.flash(120, 255, 140, 40);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const fp = this.scene.add.circle(p.x, p.y, 5, FIRE.trailColor, 0.9).setDepth(12);
      this.scene.tweens.add({
        targets: fp, x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40,
        alpha: 0, duration: 350, onComplete: () => fp.destroy()
      });
    }
    this.scene.events.emit('fire-on');
  }

  endFire() {
    this.active = false;
    this.trail = [];
    this.trailGfx.clear();
    this.scene.events.emit('fire-off');
  }

  // ---------- 主循环 ----------
  update(time) {
    if (!this.active) return;
    const p = this.scene.player;
    if (!p.alive) { this.endFire(); return; }

    const last = this.trail[this.trail.length - 1];
    const d = Phaser.Math.Distance.Between(p.x, p.y, last.x, last.y);
    if (d >= FIRE.trailSpacing) this.addPoint(p.x, p.y);

    this.redraw();
  }

  addPoint(x, y) {
    const n = this.trail.length;
    const prev = this.trail[n - 1];

    // 新线段 prev->(x,y) 是否与之前的线段相交(跳过相邻段)
    for (let k = 0; k <= n - 3; k++) {
      const a = this.trail[k];
      const b = this.trail[k + 1];
      const hit = segIntersect(prev.x, prev.y, x, y, a.x, a.y, b.x, b.y);
      if (hit) {
        const poly = [hit];
        for (let j = k + 1; j < n; j++) poly.push({ x: this.trail[j].x, y: this.trail[j].y });
        if (polygonArea(poly) >= FIRE.minLoopArea) {
          this.captureArea(poly);
          this.endFire();   // 一次性:烧一次即结束
          return;
        }
        // 面积过小:忽略并从当前位置重新开始
        this.trail = [{ x, y }];
        return;
      }
    }

    this.trail.push({ x, y });
    if (this.trail.length > FIRE.maxTrailPoints) this.trail.shift();
  }

  // ---------- 圈地结算 ----------
  captureArea(poly) {
    const g = this.scene.add.graphics().setDepth(3);
    g.fillStyle(FIRE.fillColor, FIRE.fillAlpha);
    g.beginPath();
    g.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) g.lineTo(poly[i].x, poly[i].y);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, FIRE.trailColor, 0.9);
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: FIRE.fillFade, onComplete: () => g.destroy() });

    const hostiles = this.scene.getHostiles();
    let burned = 0;
    for (const h of hostiles) {
      if (pointInPolygon(h.x, h.y, poly)) {
        this.scene.damageHostile(h, FIRE.burnDamage);
        burned += 1;
      }
    }
    if (burned > 0) this.scene.cameras.main.shake(120, 0.005);
    this.scene.events.emit('area-captured', burned);
  }

  // ---------- 绘制 ----------
  redraw() {
    const g = this.trailGfx;
    g.clear();
    if (this.trail.length < 2) return;
    g.lineStyle(FIRE.trailWidth + 5, FIRE.trailGlow, 0.35);
    this.strokeTrail(g);
    g.lineStyle(FIRE.trailWidth, FIRE.trailColor, 0.95);
    this.strokeTrail(g);
  }

  strokeTrail(g) {
    const t = this.trail;
    g.beginPath();
    g.moveTo(t[0].x, t[0].y);
    for (let i = 1; i < t.length; i++) g.lineTo(t[i].x, t[i].y);
    g.strokePath();
  }
}

// ===== 几何工具 =====
function segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return null;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  return null;
}

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  }
  return Math.abs(a / 2);
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x; const yi = poly[i].y;
    const xj = poly[j].x; const yj = poly[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
