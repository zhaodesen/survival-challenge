import Phaser from 'phaser';
import { DEVICES, SKILL } from '../config/balance.js';

/**
 * SkillSystem —— 角色自带技能(进入技能阶段后)。
 * 玩家选择 3 种能力(对应机关类型),技能从角色位置自动释放,可花金币升级。
 */
export default class SkillSystem {
  constructor(scene) {
    this.scene = scene;
    this.skills = []; // [{ type, level, lastTick, beam }]
  }

  get count() { return this.skills.length; }

  addSkill(type) {
    const skill = { type, level: 1, lastTick: 0, aimAngle: 0, lastRetarget: 0, beam: null };
    if (type === 'laser') skill.beam = this.scene.add.graphics().setDepth(8);
    this.skills.push(skill);
  }

  upgrade(index) {
    const sk = this.skills[index];
    if (!sk || sk.level >= SKILL.maxLevel) return false;
    sk.level += 1;
    return true;
  }

  isMax(index) {
    return this.skills[index] && this.skills[index].level >= SKILL.maxLevel;
  }

  statsFor(type, level) {
    const base = { ...DEVICES[type] };
    const L = level - 1;
    SKILL.damageKeys.forEach((k) => { if (k in base) base[k] = DEVICES[type][k] * SKILL.baseMul * Math.pow(SKILL.damagePerLevel, L); });
    SKILL.intervalKeys.forEach((k) => { if (k in base) base[k] = DEVICES[type][k] * Math.pow(SKILL.intervalPerLevel, L); });
    SKILL.rangeKeys.forEach((k) => { if (k in base) base[k] = DEVICES[type][k] * Math.pow(SKILL.rangePerLevel, L); });
    return base;
  }

  /** 展示用属性行 */
  statRows(type, level) {
    const s = this.statsFor(type, level);
    const map = {
      cannon: [['攻击力', 'damage'], ['间隔', 'interval', 's'], ['半径', 'radius', 'px']],
      laser: [['每秒伤害', 'dps'], ['长度', 'length', 'px']],
      bow: [['伤害', 'damage'], ['间隔', 'interval', 's'], ['射程', 'range', 'px']],
      thunder: [['伤害', 'mainDamage'], ['间隔', 'interval', 's'], ['溅射', 'splashRadius', 'px']],
      slow: [['减速', 'slowFactor', '%down'], ['持续', 'duration', 's'], ['冷却', 'cooldown', 's']]
    };
    return (map[type] || []).map(([label, key, unit]) => {
      const v = s[key];
      let text;
      if (unit === 's') text = `${(v / 1000).toFixed(2)}s`;
      else if (unit === 'px') text = `${Math.round(v)}`;
      else if (unit === '%down') text = `-${Math.round((1 - v) * 100)}%`;
      else text = `${Math.round(v)}`;
      return { label, text };
    });
  }

  nearestHostile(ox, oy, range) {
    const hostiles = this.scene.getHostiles();
    let best = null; let bestD = range * range;
    for (const h of hostiles) {
      const d = Phaser.Math.Distance.Squared(ox, oy, h.x, h.y);
      if (d <= bestD) { bestD = d; best = h; }
    }
    return best;
  }

  update(time, delta) {
    const p = this.scene.player;
    if (!p || !p.alive) {
      this.skills.forEach((sk) => { if (sk.beam) sk.beam.clear(); });
      return;
    }
    for (const sk of this.skills) {
      const st = this.statsFor(sk.type, sk.level);
      this[`cast_${sk.type}`](sk, st, p, time, delta);
    }
  }

  // ---------- 各技能释放(原点 = 玩家) ----------
  cast_cannon(sk, st, p, time) {
    if (time - sk.lastTick < st.interval) return;
    const t = this.nearestHostile(p.x, p.y, st.range);
    if (!t) return;
    sk.lastTick = time;
    const tx = t.x; const ty = t.y;
    this.scene.fxTelegraph(tx, ty, st.radius, st.color, 280, () => {
      this.scene.fxExplosion(tx, ty, st.radius, st.color);
      const r2 = st.radius * st.radius;
      for (const h of this.scene.getHostiles()) {
        if (Phaser.Math.Distance.Squared(tx, ty, h.x, h.y) <= r2) this.scene.damageHostile(h, st.damage);
      }
    });
  }

  cast_laser(sk, st, p, time, delta) {
    if (time - sk.lastRetarget > st.retargetMs) {
      sk.lastRetarget = time;
      const t = this.nearestHostile(p.x, p.y, st.length);
      if (t) sk.aimAngle = Math.atan2(t.y - p.y, t.x - p.x);
    }
    const ex = p.x + Math.cos(sk.aimAngle) * st.length;
    const ey = p.y + Math.sin(sk.aimAngle) * st.length;
    const g = sk.beam;
    g.clear();
    g.lineStyle(st.width, st.color, 0.85);
    g.lineBetween(p.x, p.y, ex, ey);
    g.lineStyle(st.width * 0.4, 0xffffff, 0.9);
    g.lineBetween(p.x, p.y, ex, ey);
    const dmg = st.dps * delta / 1000;
    const half = st.width / 2 + 6;
    for (const h of this.scene.getHostiles()) {
      const d = distToSegment(h.x, h.y, p.x, p.y, ex, ey);
      if (d <= half + (h.radius || 12)) this.scene.damageHostile(h, dmg);
    }
  }

  cast_bow(sk, st, p, time) {
    if (time - sk.lastTick < st.interval) return;
    const t = this.nearestHostile(p.x, p.y, st.range);
    if (!t) return;
    sk.lastTick = time;
    this.scene.fireArrow(p.x, p.y, t, st.damage, st.projSpeed);
  }

  cast_thunder(sk, st, p, time) {
    if (time - sk.lastTick < st.interval) return;
    const main = this.nearestHostile(p.x, p.y, st.range);
    if (!main) return;
    sk.lastTick = time;
    this.scene.fxLightning(p.x, p.y, main.x, main.y, st.color);
    const r2 = st.splashRadius * st.splashRadius;
    const splash = [];
    for (const h of this.scene.getHostiles()) {
      if (h === main) continue;
      const d2 = Phaser.Math.Distance.Squared(main.x, main.y, h.x, h.y);
      if (d2 <= r2) splash.push({ h, d2 });
    }
    splash.sort((a, b) => a.d2 - b.d2);
    this.scene.damageHostile(main, st.mainDamage);
    splash.forEach((s, i) => {
      const factor = Math.max(st.minFactor, 1 - st.decayPerLayer * (i + 1));
      this.scene.fxLightning(main.x, main.y, s.h.x, s.h.y, st.color, 0.5);
      this.scene.damageHostile(s.h, st.mainDamage * factor);
    });
  }

  cast_slow(sk, st, p, time) {
    if (time - sk.lastTick < st.cooldown) return;
    sk.lastTick = time;
    const until = time + st.duration;
    this.scene.spawnManager.applySlowAll(st.slowFactor, until);
    this.scene.activeSlowUntil = until;
    if (this.scene.waveManager.hasBoss) this.scene.waveManager.boss.applySlow(st.slowFactor, until);
    this.scene.cameras.main.flash(150, 120, 160, 255);
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Phaser.Math.Clamp(t, 0, 1);
  return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
}
