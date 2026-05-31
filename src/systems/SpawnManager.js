import Phaser from 'phaser';
import Enemy from '../entities/Enemy.js';
import { ENEMY } from '../config/balance.js';

/**
 * SpawnManager —— 敌人对象池工厂。具体何时刷、刷多少由 WaveManager 调度。
 */
export default class SpawnManager {
  constructor(scene, difficulty) {
    this.scene = scene;
    this.difficulty = difficulty;

    this.group = scene.physics.add.group({
      classType: Enemy,
      runChildUpdate: true,
      maxSize: -1
    });
  }

  get activeCount() {
    return this.group.countActive(true);
  }

  /** 从池获取一个敌人(复用 inactive 的) */
  obtain(x, y) {
    let e = this.group.getFirstDead(false);
    if (!e) {
      e = new Enemy(this.scene, x, y);
      this.group.add(e);
    }
    return e;
  }

  /** 在玩家屏幕外随机方向生成一个敌人,返回该敌人 */
  spawnOffscreen() {
    const cam = this.scene.cameras.main;
    const player = this.scene.player;
    const halfW = cam.width / 2 / cam.zoom;
    const halfH = cam.height / 2 / cam.zoom;
    const margin = Math.max(halfW, halfH) + ENEMY.spawnRadius;

    const angle = Math.random() * Math.PI * 2;
    let x = player.x + Math.cos(angle) * margin;
    let y = player.y + Math.sin(angle) * margin;

    const b = this.scene.physics.world.bounds;
    x = Phaser.Math.Clamp(x, b.x + 20, b.right - 20);
    y = Phaser.Math.Clamp(y, b.y + 20, b.bottom - 20);

    const typeKey = this.difficulty.pickEnemyType();
    const stats = this.difficulty.getEnemyStats(typeKey);
    const e = this.obtain(x, y);
    e.spawn(x, y, typeKey, stats);
    return e;
  }

  /** 在指定点附近生成一个敌人(Boss 召唤用) */
  spawnAt(cx, cy) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 70;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist;
    const typeKey = this.difficulty.pickEnemyType();
    const stats = this.difficulty.getEnemyStats(typeKey);
    const e = this.obtain(x, y);
    e.spawn(x, y, typeKey, stats);
    return e;
  }

  /** Boss 在自身周围召唤小怪(受场上上限约束) */
  summonAround(cx, cy, count) {
    const cap = this.scene.waveManager ? this.scene.waveManager.concurrentCap : 80;
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= cap) break;
      this.spawnAt(cx, cy);
    }
  }

  /** 对所有活跃敌人施加减速 */
  applySlowAll(factor, until) {
    this.group.children.iterate((e) => {
      if (e && e.active) e.applySlow(factor, until);
      return true;
    });
  }
}
