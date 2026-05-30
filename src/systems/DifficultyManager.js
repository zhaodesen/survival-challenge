import { DIFFICULTY, ENEMY } from '../config/balance.js';

/**
 * DifficultyManager —— 按存活时间计算难度系数。
 * 每 30 秒一档,敌人血/攻/防与刷新数量平滑递增。
 */
export default class DifficultyManager {
  constructor() {
    this.elapsedMs = 0;
  }

  update(delta) {
    this.elapsedMs += delta;
  }

  get seconds() {
    return this.elapsedMs / 1000;
  }

  get tier() {
    return Math.floor(this.seconds / DIFFICULTY.stepSeconds);
  }

  /** 当前场上敌人数量上限 */
  get maxAlive() {
    const v = DIFFICULTY.maxAliveBase + this.tier * DIFFICULTY.maxAliveAddPerTier;
    return Math.min(v, DIFFICULTY.maxAliveCap);
  }

  /** 当前刷新间隔(毫秒) */
  get spawnInterval() {
    const v = ENEMY.spawnIntervalBase / Math.pow(DIFFICULTY.spawnRateMul, this.tier);
    return Math.max(ENEMY.spawnIntervalMin, v);
  }

  /** 当前每批刷新数量 */
  get spawnBatch() {
    return ENEMY.spawnBatchBase + Math.floor(this.tier / 2);
  }

  /** 根据难度返回某类型敌人的实际属性 */
  getEnemyStats(typeKey) {
    const base = ENEMY.types[typeKey];
    const t = this.tier;
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

  /** 根据当前时间选择敌人类型(加权随机) */
  pickEnemyType() {
    const sec = this.seconds;
    let weights = ENEMY.unlock[0].weights;
    for (const u of ENEMY.unlock) {
      if (sec >= u.time) weights = u.weights;
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
