import Phaser from 'phaser';
import Device from './Device.js';

/** 💥 火炮台:周期性对一片区域造成范围伤害 */
export class Cannon extends Device {
  constructor(scene, x, y) { super(scene, x, y, 'cannon'); }

  onTick(time) {
    if (time - this.lastTick < this.cfg.interval) return;
    const target = this.nearestHostile(this.cfg.range);
    if (!target) return;
    this.lastTick = time;

    const tx = target.x; const ty = target.y;
    // 落点预警 + 爆炸
    this.scene.fxTelegraph(tx, ty, this.cfg.radius, this.cfg.color, 350, () => {
      this.scene.fxExplosion(tx, ty, this.cfg.radius, this.cfg.color);
      const hostiles = this.scene.getHostiles();
      const r2 = this.cfg.radius * this.cfg.radius;
      for (const h of hostiles) {
        if (Phaser.Math.Distance.Squared(tx, ty, h.x, h.y) <= r2) {
          this.scene.damageHostile(h, this.cfg.damage);
        }
      }
    });
  }
}

/** 🔆 激光炮:朝最近目标方向发射穿透直线激光 */
export class Laser extends Device {
  constructor(scene, x, y) {
    super(scene, x, y, 'laser');
    this.beam = scene.add.graphics().setDepth(8);
    this.aimAngle = 0;
    this.lastRetarget = 0;
  }

  onDeactivate() { this.beam.clear(); }

  onTick(time, delta) {
    if (time - this.lastRetarget > this.cfg.retargetMs) {
      this.lastRetarget = time;
      const t = this.nearestHostile(this.cfg.length);
      if (t) this.aimAngle = Math.atan2(t.y - this.y, t.x - this.x);
    }

    const ex = this.x + Math.cos(this.aimAngle) * this.cfg.length;
    const ey = this.y + Math.sin(this.aimAngle) * this.cfg.length;

    // 绘制激光
    this.beam.clear();
    this.beam.lineStyle(this.cfg.width, this.cfg.color, 0.85);
    this.beam.lineBetween(this.x, this.y, ex, ey);
    this.beam.lineStyle(this.cfg.width * 0.4, 0xffffff, 0.9);
    this.beam.lineBetween(this.x, this.y, ex, ey);

    // 对线段范围内所有目标造成 dps
    const dmg = this.cfg.dps * delta / 1000;
    const hostiles = this.scene.getHostiles();
    const half = this.cfg.width / 2 + 6;
    for (const h of hostiles) {
      const d = distToSegment(h.x, h.y, this.x, this.y, ex, ey);
      if (d <= half + (h.radius || 12)) {
        this.scene.damageHostile(h, dmg);
      }
    }
  }
}

/** 🏹 弓箭:持续锁定单个最近目标射箭 */
export class Bow extends Device {
  constructor(scene, x, y) { super(scene, x, y, 'bow'); }

  onTick(time) {
    if (time - this.lastTick < this.cfg.interval) return;
    const target = this.nearestHostile(this.cfg.range);
    if (!target) return;
    this.lastTick = time;
    this.scene.fireArrow(this.x, this.y, target, this.cfg.damage, this.cfg.projSpeed);
  }
}

/** ⚡ 雷电站:打单体,对周围所有敌人溅射,逐层衰减 10%,最低 40% */
export class Thunder extends Device {
  constructor(scene, x, y) { super(scene, x, y, 'thunder'); }

  onTick(time) {
    if (time - this.lastTick < this.cfg.interval) return;
    const main = this.nearestHostile(this.cfg.range);
    if (!main) return;
    this.lastTick = time;

    // 主目标
    this.scene.fxLightning(this.x, this.y, main.x, main.y, this.cfg.color);
    // 收集溅射目标(按到主目标距离排序)
    const hostiles = this.scene.getHostiles();
    const r2 = this.cfg.splashRadius * this.cfg.splashRadius;
    const splash = [];
    for (const h of hostiles) {
      if (h === main) continue;
      const d2 = Phaser.Math.Distance.Squared(main.x, main.y, h.x, h.y);
      if (d2 <= r2) splash.push({ h, d2 });
    }
    splash.sort((a, b) => a.d2 - b.d2);

    this.scene.damageHostile(main, this.cfg.mainDamage);
    splash.forEach((s, i) => {
      const factor = Math.max(this.cfg.minFactor, 1 - this.cfg.decayPerLayer * (i + 1));
      this.scene.fxLightning(main.x, main.y, s.h.x, s.h.y, this.cfg.color, 0.5);
      this.scene.damageHostile(s.h, this.cfg.mainDamage * factor);
    });
  }
}

/** 🐌 全体减速站:触发后全场敌人移速 -50%,持续 15 秒,带冷却 */
export class SlowStation extends Device {
  constructor(scene, x, y) {
    super(scene, x, y, 'slow');
    this.readyAt = 0;
  }

  onActivate(time) { this.tryTrigger(time); }
  onTick(time) { this.tryTrigger(time); }

  tryTrigger(time) {
    if (time < this.readyAt) return;
    this.readyAt = time + this.cfg.cooldown;
    const until = time + this.cfg.duration;
    this.scene.spawnManager.applySlowAll(this.cfg.slowFactor, until);
    this.scene.activeSlowUntil = until;        // 让后续生成的敌人也减速(GameScene 处理)
    this.scene.cameras.main.flash(200, 120, 160, 255);
    this.scene.events.emit('slow-triggered', this.cfg.duration);
  }
}

export const DEVICE_CLASSES = {
  cannon: Cannon,
  laser: Laser,
  bow: Bow,
  thunder: Thunder,
  slow: SlowStation
};

// 点到线段距离
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Phaser.Math.Clamp(t, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Phaser.Math.Distance.Between(px, py, cx, cy);
}
