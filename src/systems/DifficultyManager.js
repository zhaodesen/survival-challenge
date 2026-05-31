import { DIFFICULTY, ENEMY } from '../config/balance.js';

/**
 * DifficultyManager —— 以"关数"为单位缩放敌人属性。
 * elapsedMs 仅用于 HUD 上的存活计时显示。
 */
export default class DifficultyManager {
  constructor() {
    this.elapsedMs = 0;
    this.wave = 1;
  }

  update(delta) {
    this.elapsedMs += delta;
  }

  setWave(wave) {
    this.wave = wave;
  }

  get seconds() {
    return this.elapsedMs / 1000;
  }

  /** 根据当前关数返回某类型敌人的实际属性 */
  getEnemyStats(typeKey) {
    const base = ENEMY.types[typeKey];
    const t = this.wave - 1;
    return {
      hp: Math.round(base.hp * Math.pow(DIFFICULTY.enemyHpMul, t)),
      speed: base.speed,
      atk: Math.round(base.atk * Math.pow(DIFFICULTY.enemyAtkMul, t)),
      def: base.def + Math.round(DIFFICULTY.enemyDefAdd * t),
      radius: base.radius,
      contactCd: base.contactCd,
      xp: base.xp
    };
  }

  /** 根据当前关数选择敌人类型(加权随机) */
  pickEnemyType() {
    let weights = ENEMY.unlockByWave[0].weights;
    for (const u of ENEMY.unlockByWave) {
      if (this.wave >= u.wave) weights = u.weights;
    }
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [key, w] of entries) {
      r -= w;
      if (r <= 0) return key;
    }
    return entries[0][0];
  }
}
