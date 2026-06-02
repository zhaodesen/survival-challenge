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
  maxHp: 100,
  speed: 230,
  radius: 16,
  color: 0x4fd1ff,
  // 受击后的无敌帧(毫秒),避免同一帧被多次扣血
  hurtInvuln: 300
};

/**
 * 难度:以"关数"为单位逐关递增(每关 = 一档)。
 */
export const DIFFICULTY = {
  enemyHpMul: 1.10,      // 每关敌人血量 ×1.10
  enemyAtkMul: 1.06,     // 每关攻击 ×1.06
  enemyDefAdd: 1.0       // 每关防御 +1.0
};

/**
 * 关卡(波次):每关固定敌人数量,清完进下一关。每 bossEvery 关一个 Boss 关。
 */
export const WAVE = {
  firstWaveEnemies: 12,      // 第 1 关敌人总数
  enemiesPerWaveAdd: 5,      // 每关 +5
  bossEvery: 5,              // 每 5 关一个 Boss 关
  bossMinions: 6,            // Boss 关附带的小怪数
  concurrentBase: 16,        // 场上同时存在敌人上限(基础)
  concurrentAddPerWave: 2,   // 每关 +2
  concurrentCap: 110,        // 硬上限,保护性能
  trickleInterval: 380,      // 关内每隔多久放一批
  trickleBatch: 3,           // 每批数量
  intermission: 2600,        // 关与关之间的准备时间(ms)
  bossWarning: 5000          // Boss 关出场前倒计时(ms)
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
    tank: {   // 肉盾,血厚高防但移速很慢
      hp: 140, speed: 30, atk: 14, def: 5, radius: 20, color: 0xa06bff, contactCd: 800, xp: 3
    },
    striker: { // 刺客,攻击力很高但血量很低
      hp: 16, speed: 70, atk: 28, def: 0, radius: 12, color: 0xff2d55, contactCd: 700, xp: 2
    }
  },
  // 各类型按"关数"解锁与权重
  unlockByWave: [
    { wave: 1, weights: { grunt: 1.0, runner: 0.0, tank: 0.0, striker: 0.0 } },
    { wave: 2, weights: { grunt: 0.7, runner: 0.3, tank: 0.0, striker: 0.0 } },
    { wave: 3, weights: { grunt: 0.55, runner: 0.3, tank: 0.0, striker: 0.15 } },
    { wave: 4, weights: { grunt: 0.45, runner: 0.28, tank: 0.15, striker: 0.12 } },
    { wave: 7, weights: { grunt: 0.36, runner: 0.3, tank: 0.18, striker: 0.16 } }
  ],
  spawnRadius: 120          // 在屏幕外多远生成
};

export const BOSS = {
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
  summonCount: 4,
  // 技能:冲击波(以 Boss 为中心扩散的环,命中玩家造成伤害)
  shockwaveCd: 7000,
  shockwaveWindup: 700,
  shockwaveRadius: 260,
  shockwaveDamage: 22,
  // 技能:地面砸击(在玩家当前位置预警后落下范围伤害)
  slamCd: 5500,
  slamWindup: 900,
  slamRadius: 130,
  slamDamage: 26,
  // 狂暴:血量低于该比例时移速/攻击提升
  enrageHpRatio: 0.35,
  enrageSpeedMul: 1.5,
  enrageAtkMul: 1.3
};

/**
 * 机关配置。device.type 对应 devices/ 下的类。
 * pos 为世界坐标(地图中心约在 1400,1400)。
 */
export const DEVICES = {
  // 共用外观
  baseRadius: 34,
  controlRadius: 118,
  // 教学:前几关每关引入一种机关(顺序由简到繁)
  introOrder: ['bow', 'cannon', 'laser', 'thunder', 'slow'],
  // 机关位置随机生成的约束
  spawnMargin: 320,       // 距地图边缘
  minDistBetween: 380,    // 机关之间最小间距
  minPlayerDist: 280,     // 距玩家出生点最小距离
  // 各机关的名称与教学说明
  info: {
    bow:     { name: '弓箭', desc: '持续锁定最近的单个敌人射箭。靠近机关进入操控圈即可连接操控;点击机关可花金币升级。' },
    cannon:  { name: '火炮台', desc: '周期性向敌群轰炸一片区域,造成范围伤害。适合清理成群的敌人。' },
    laser:   { name: '激光炮', desc: '朝最近敌人方向发射穿透直线激光,持续灼烧路径上的所有敌人。' },
    thunder: { name: '雷电站', desc: '电击单体并向周围溅射,每层衰减 10%(最低 40%)。越密集越赚。' },
    slow:    { name: '全体减速站', desc: '触发后全场敌人移速减半,持续一段时间,带冷却。危急时争取喘息。' }
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

/**
 * 机关升级:点击机关花金币升级,满级 10 级。
 * 升级提升攻击力 / 攻击频率(间隔变短)/ 攻击范围。
 */
export const UPGRADE = {
  cost: 50,              // 每次升级花费金币
  maxLevel: 10,
  damagePerLevel: 1.18,  // 攻击力每级 ×1.18
  intervalPerLevel: 0.93,// 攻击间隔每级 ×0.93(频率更快)
  rangePerLevel: 1.06,   // 攻击范围每级 ×1.06
  // 受缩放影响的字段分桶
  damageKeys: ['damage', 'dps', 'mainDamage'],
  intervalKeys: ['interval', 'cooldown', 'retargetMs'],
  rangeKeys: ['range', 'radius', 'splashRadius', 'length', 'duration']
};

/**
 * 技能系统(后期):全机关满级后,角色选择 3 项能力变为自身技能,自动释放。
 * 每 10 金币升级一次,巨幅提升能力。机关随之消失,之后每关都是 Boss 关。
 */
export const SKILL = {
  cost: 10,              // 每次升级花费金币
  maxLevel: 30,
  baseMul: 1.6,          // 技能基础伤害相对机关 ×1.6
  damagePerLevel: 1.35,  // 攻击力每级 ×1.35(巨幅)
  intervalPerLevel: 0.90,// 攻击间隔每级 ×0.90(更快)
  rangePerLevel: 1.10,   // 范围每级 ×1.10
  damageKeys: ['damage', 'dps', 'mainDamage'],
  intervalKeys: ['interval', 'cooldown', 'retargetMs'],
  rangeKeys: ['range', 'radius', 'splashRadius', 'length', 'duration'],
  // 进入技能阶段后,每关 Boss 关的小怪数量
  bossMinionsPerWave: 12,
  // Boss 史诗级增强(在原逐关缩放基础上叠加)
  epicHpMul: 6,
  epicAtkMul: 2.4,
  epicHpGrowthPerWave: 1.45,  // 进入技能阶段后,每关 Boss 血量额外 ×1.45
  epicAtkGrowthPerWave: 1.16
};

/**
 * 火焰圈地系统(一次性):吃到火焰碎片后进入火焰模式,移动留下火焰轨迹,
 * 轨迹自交闭合即把围住区域染红、烧死区域内所有敌人;烧一次后火焰模式结束。
 */
export const FIRE = {
  fragmentRadius: 13,
  fragmentColor: 0xff7a18,
  trailSpacing: 12,         // 轨迹采点间距(px)
  trailWidth: 7,
  trailColor: 0xff7a18,
  trailGlow: 0xffd166,
  fillColor: 0xff3020,      // 圈住区域填充色
  fillAlpha: 0.35,
  fillFade: 1400,           // 红色区域淡出时长(ms)
  burnDamage: 600,          // 圈内造成的伤害(秒杀普通怪,对 Boss 是大额伤害)
  minLoopArea: 1600,        // 小于该面积的环忽略(避免误触发)
  maxTrailPoints: 600       // 轨迹点上限(性能保护)
};

/**
 * 掉落与道具系统:击败敌人有几率掉落碎片(火焰/金币堆/各种增益)。
 * 火焰碎片每 5 关最多 3 个。金币击杀自动获得,金币堆需移动拾取。
 */
export const PICKUPS = {
  coinPerKill: 2,          // 每击杀自动获得金币
  itemDropChance: 0.12,    // 击杀掉落"增益/金币堆"碎片的概率
  fireDropChance: 0.07,    // 击杀掉落"火焰碎片"的概率
  fireMaxPer5Waves: 3,     // 火焰碎片每 5 关上限
  lifespan: 13000,         // 碎片在地图上的存活时间(ms),超时消失
  pickupRadius: 16,
  // 金币堆:吃到金币堆碎片后,附近生成整齐排列的金币区域
  coinGrid: { cols: 4, rows: 3, spacing: 48, value: 5, radius: 11 },
  coinMagnetRadius: 260,
  coinMagnetSpeed: 620,
  // 各增益碎片掉落权重(火焰单独计算,不在此表)
  weights: {
    coin: 1.3, slowAll: 1.0, defDown: 1.0, atkDown: 1.0,
    kill10: 0.7, atkUp: 1.0, invincible: 0.8, heal30: 1.0, timeStop: 0.6
  },
  // 各增益参数
  effects: {
    slowAll:    { duration: 6000, factor: 0.5 },   // 群体减速 50% 6s
    defDown:    { duration: 8000, factor: 0.4 },   // 敌人防御 ×0.4 8s
    atkDown:    { duration: 8000, factor: 0.5 },   // 敌人攻击 ×0.5 8s
    kill10:     { count: 10 },                     // 随机消灭 10 个敌人
    atkUp:      { duration: 10000, mul: 1.8 },     // 我方输出 ×1.8 10s
    invincible: { duration: 2000 },                // 无敌 2s
    heal30:     { percent: 0.3 },                  // 恢复 30% 生命
    timeStop:   { duration: 5000 }                 // 时间停止 5s(敌人静止,角色可动可攻击)
  },
  // 外观颜色与名称
  meta: {
    fire:       { color: 0xff7a18, name: '火焰' },
    coin:       { color: 0xffd24a, name: '金币堆' },
    slowAll:    { color: 0x7fa8ff, name: '群体减速' },
    defDown:    { color: 0x9b8cff, name: '减防御' },
    atkDown:    { color: 0x6bd3ff, name: '降攻击' },
    kill10:     { color: 0xff4d4d, name: '秒杀10' },
    atkUp:      { color: 0xff9f43, name: '攻击提升' },
    invincible: { color: 0xfff27a, name: '无敌2秒' },
    heal30:     { color: 0x49e07a, name: '回血30%' },
    timeStop:   { color: 0x9be7ff, name: '时间停止' }
  }
};

export const SCORE = {
  // 每击杀基础分,Boss 额外加成
  perKill: 10,
  perBossKill: 500
};
