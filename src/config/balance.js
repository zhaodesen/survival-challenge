/**
 * balance.js —— 全局数值配置表
 * 所有可调数值集中在此,方便后期平衡。修改这里即可影响全局手感。
 */

export const WORLD = {
  width: 2800,
  height: 2800,
  bgColor: 0x12161f,
  gridColor: 0x1c2330
};

export const PLAYER = {
  maxHp: 200,
  speed: 220,
  radius: 16,
  color: 0x4fd1ff,
  // 受击后的无敌帧(毫秒),避免同一帧被多次扣血
  hurtInvuln: 300
};

/**
 * 难度:每 30 秒提升一档(tier),幅度小而稳。
 * 当前系数 = 基准 * 倍率^tier(线性项用加法)。
 */
export const DIFFICULTY = {
  stepSeconds: 30,
  enemyHpMul: 1.07,      // 每档敌人血量 ×1.07
  enemyAtkMul: 1.05,     // 每档攻击 ×1.05
  enemyDefAdd: 1.2,      // 每档防御 +1.2
  spawnRateMul: 1.08,    // 每档刷新速率 ×1.08
  maxAliveBase: 40,      // 初始场上最大敌人数
  maxAliveAddPerTier: 6, // 每档 +6 上限
  maxAliveCap: 300       // 硬上限,保护性能
};

export const ENEMY = {
  // 基础属性(tier 0)。实际值会被难度系数放大。
  types: {
    grunt: {  // 标准近战
      hp: 30, speed: 55, atk: 8, def: 0, radius: 13, color: 0xff6b6b, contactCd: 600, xp: 1
    },
    runner: { // 快速冲锋,血薄
      hp: 18, speed: 95, atk: 6, def: 0, radius: 10, color: 0xffd166, contactCd: 500, xp: 1
    },
    tank: {   // 肉盾,慢但高血高防
      hp: 90, speed: 38, atk: 14, def: 4, radius: 18, color: 0xa06bff, contactCd: 800, xp: 3
    }
  },
  // 各类型随时间解锁与权重(秒)
  unlock: [
    { time: 0,   weights: { grunt: 1.0, runner: 0.0, tank: 0.0 } },
    { time: 45,  weights: { grunt: 0.7, runner: 0.3, tank: 0.0 } },
    { time: 120, weights: { grunt: 0.55, runner: 0.3, tank: 0.15 } },
    { time: 240, weights: { grunt: 0.45, runner: 0.35, tank: 0.2 } }
  ],
  spawnIntervalBase: 900,   // 初始每 900ms 刷一批
  spawnIntervalMin: 180,    // 最快刷新间隔
  spawnBatchBase: 2,        // 每批基础数量
  spawnRadius: 120          // 在屏幕外多远生成
};

export const BOSS = {
  intervalSeconds: 60,  // 每 60 秒一个 Boss
  warningSeconds: 5,    // 出场前 5 秒倒计时
  base: {
    hp: 1200, speed: 42, atk: 30, def: 8, radius: 38, color: 0xff3d7f, contactCd: 700
  },
  // Boss 随出场序号(第几个)增强
  hpMulPerSpawn: 1.35,
  atkMulPerSpawn: 1.18,
  defAddPerSpawn: 5,
  // 技能:周期性冲撞玩家
  chargeCd: 4500,
  chargeSpeed: 360,
  chargeWindup: 800,
  // 技能:召唤小怪
  summonCd: 8000,
  summonCount: 4
};

/**
 * 机关配置。device.type 对应 devices/ 下的类。
 * pos 为世界坐标(地图中心约在 1400,1400)。
 */
export const DEVICES = {
  // 共用外观
  baseRadius: 34,
  layout: [
    { type: 'heal',    x: 1400, y: 1400 },  // 中心:恢复站
    { type: 'cannon',  x: 800,  y: 800 },
    { type: 'laser',   x: 2000, y: 800 },
    { type: 'bow',     x: 800,  y: 2000 },
    { type: 'thunder', x: 2000, y: 2000 },
    { type: 'slow',    x: 1400, y: 700 },
    { type: 'cannon',  x: 1400, y: 2100 },
    { type: 'bow',     x: 700,  y: 1400 },
    { type: 'laser',   x: 2100, y: 1400 }
  ],
  heal: {
    color: 0x49e07a,
    hpPerSec: 14
  },
  cannon: {
    color: 0xff8c42,
    interval: 1100,   // 开炮间隔
    radius: 90,       // AOE 半径
    damage: 38,       // 范围伤害
    range: 520        // 索敌范围
  },
  laser: {
    color: 0x42e6ff,
    width: 16,        // 激光宽度(半宽判定)
    length: 700,      // 激光长度
    dps: 90,          // 每秒伤害(穿透所有命中目标)
    retargetMs: 250   // 重新瞄准间隔
  },
  bow: {
    color: 0xc6ff42,
    interval: 420,    // 射击间隔
    damage: 26,       // 单体伤害
    range: 560,
    projSpeed: 460
  },
  thunder: {
    color: 0xb98cff,
    interval: 900,
    mainDamage: 70,   // 主目标伤害
    splashRadius: 180,// 溅射半径
    decayPerLayer: 0.1, // 每层衰减 10%
    minFactor: 0.4,   // 最低 40%
    range: 540
  },
  slow: {
    color: 0x7fa8ff,
    slowFactor: 0.5,  // 减速 50%(移速 ×0.5)
    duration: 15000,  // 持续 15 秒
    cooldown: 22000   // 冷却 22 秒
  }
};

export const SCORE = {
  // 每击杀基础分,Boss 额外加成
  perKill: 10,
  perBossKill: 500
};
