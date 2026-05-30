import Phaser from 'phaser';
import Boss from '../entities/Boss.js';
import { BOSS } from '../config/balance.js';

/**
 * BossManager —— 每 60 秒一个 Boss,出场前 5 秒倒计时。
 */
export default class BossManager {
  constructor(scene, difficulty) {
    this.scene = scene;
    this.difficulty = difficulty;
    this.spawnCount = 0;
    this.elapsed = 0;
    this.nextBossAt = BOSS.intervalSeconds * 1000;
    this.warning = false;
    this.warnFiredAt = -1;
    this.boss = null;

    // Boss 容器组(用于碰撞/索敌统一处理)
    this.group = scene.physics.add.group({ runChildUpdate: true });
  }

  get hasBoss() {
    return this.boss && this.boss.active;
  }

  update(time, delta) {
    this.elapsed += delta;

    const warnAt = this.nextBossAt - BOSS.warningSeconds * 1000;

    // 触发倒计时
    if (!this.warning && !this.hasBoss && this.elapsed >= warnAt) {
      this.warning = true;
      this.scene.events.emit('boss-warning', BOSS.warningSeconds);
    }

    // 出场
    if (this.warning && this.elapsed >= this.nextBossAt) {
      this.warning = false;
      this.spawnBoss();
      this.nextBossAt += BOSS.intervalSeconds * 1000;
    }
  }

  /** 倒计时剩余秒数(没有则返回 null) */
  get warnRemain() {
    if (!this.warning) return null;
    return Math.max(0, Math.ceil((this.nextBossAt - this.elapsed) / 1000));
  }

  spawnBoss() {
    this.spawnCount += 1;
    const idx = this.spawnCount;

    const stats = {
      hp: Math.round(BOSS.base.hp * Math.pow(BOSS.hpMulPerSpawn, idx - 1)),
      speed: BOSS.base.speed,
      atk: Math.round(BOSS.base.atk * Math.pow(BOSS.atkMulPerSpawn, idx - 1)),
      def: BOSS.base.def + BOSS.defAddPerSpawn * (idx - 1),
      contactCd: BOSS.base.contactCd
    };

    // 在玩家屏幕外生成
    const cam = this.scene.cameras.main;
    const player = this.scene.player;
    const margin = Math.max(cam.width, cam.height) / 2 / cam.zoom + 100;
    const angle = Math.random() * Math.PI * 2;
    const b = this.scene.physics.world.bounds;
    const x = Phaser.Math.Clamp(player.x + Math.cos(angle) * margin, b.x + 60, b.right - 60);
    const y = Phaser.Math.Clamp(player.y + Math.sin(angle) * margin, b.y + 60, b.bottom - 60);

    const boss = new Boss(this.scene, x, y, stats, idx);
    this.group.add(boss);
    this.boss = boss;
    this.scene.boss = boss;
    this.scene.events.emit('boss-spawned', boss, idx);
  }

  clearBoss() {
    if (this.boss) {
      this.group.remove(this.boss);
      this.boss.destroyBoss();
      this.boss = null;
      this.scene.boss = null;
    }
  }
}
