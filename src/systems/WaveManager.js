import Phaser from 'phaser';
import Boss from '../entities/Boss.js';
import { WAVE, BOSS } from '../config/balance.js';

/**
 * WaveManager —— 关卡(波次)调度。
 * 流程:准备(intermission)→[Boss 关:倒计时 bosswarn]→ 逐批生成(spawning)
 *      → 等待清场(clearing)→ 清空后进入下一关准备。
 * 每关固定敌人数;每 WAVE.bossEvery 关为 Boss 关。
 */
export default class WaveManager {
  constructor(scene, difficulty) {
    this.scene = scene;
    this.difficulty = difficulty;

    this.wave = 0;
    this.nextWave = 1;
    this.bossSpawnCount = 0;

    this.phase = 'intermission';
    this.timer = 1200;          // 开局准备时间(略短)
    this.totalThisWave = 0;
    this.spawnedThisWave = 0;
    this.accum = 0;
    this.isBossWave = false;

    this.boss = null;
    this.group = scene.physics.add.group({ runChildUpdate: true });

    scene.events.emit('wave-intermission', this.nextWave, this.timer);
  }

  get hasBoss() {
    return this.boss && this.boss.active;
  }

  get concurrentCap() {
    const v = WAVE.concurrentBase + this.wave * WAVE.concurrentAddPerWave;
    return Math.min(v, WAVE.concurrentCap);
  }

  /** 当前关剩余未消灭敌人数(含未生成的) */
  get remaining() {
    const pending = this.totalThisWave - this.spawnedThisWave;
    return pending + this.scene.spawnManager.activeCount + (this.hasBoss ? 1 : 0);
  }

  update(time, delta) {
    switch (this.phase) {
      case 'intermission':
        this.timer -= delta;
        if (this.timer <= 0) this.beginWave();
        break;

      case 'bosswarn':
        this.timer -= delta;
        if (this.timer <= 0) {
          this.spawnBoss();
          this.phase = 'spawning';
        }
        break;

      case 'spawning':
        this.accum += delta;
        while (this.accum >= WAVE.trickleInterval &&
               this.spawnedThisWave < this.totalThisWave &&
               this.scene.spawnManager.activeCount < this.concurrentCap) {
          this.scene.spawnManager.spawnOffscreen();
          this.spawnedThisWave += 1;
          this.accum -= WAVE.trickleInterval;
        }
        if (this.spawnedThisWave >= this.totalThisWave) this.phase = 'clearing';
        break;

      case 'clearing':
        if (this.scene.spawnManager.activeCount === 0 && !this.hasBoss) {
          this.waveCleared();
        }
        break;
      default:
        break;
    }
  }

  beginWave() {
    this.wave = this.nextWave;
    this.difficulty.setWave(this.wave);
    this.isBossWave = (this.wave % WAVE.bossEvery === 0);
    this.spawnedThisWave = 0;
    this.accum = 0;

    if (this.isBossWave) {
      this.totalThisWave = WAVE.bossMinions;
      this.phase = 'bosswarn';
      this.timer = WAVE.bossWarning;
      this.scene.events.emit('wave-start', this.wave, true);
      this.scene.events.emit('boss-warning', Math.ceil(WAVE.bossWarning / 1000));
    } else {
      this.totalThisWave = WAVE.firstWaveEnemies + (this.wave - 1) * WAVE.enemiesPerWaveAdd;
      this.phase = 'spawning';
      this.scene.events.emit('wave-start', this.wave, false);
    }
  }

  waveCleared() {
    this.scene.events.emit('wave-clear', this.wave);
    this.nextWave = this.wave + 1;
    this.phase = 'intermission';
    this.timer = WAVE.intermission;
    this.scene.events.emit('wave-intermission', this.nextWave, this.timer);
  }

  /** Boss 关倒计时剩余秒数(非 Boss 倒计时阶段返回 null) */
  get warnRemain() {
    if (this.phase !== 'bosswarn') return null;
    return Math.max(0, Math.ceil(this.timer / 1000));
  }

  spawnBoss() {
    this.bossSpawnCount += 1;
    const idx = this.bossSpawnCount;
    const stats = {
      hp: Math.round(BOSS.base.hp * Math.pow(BOSS.hpMulPerSpawn, idx - 1)),
      speed: BOSS.base.speed,
      atk: Math.round(BOSS.base.atk * Math.pow(BOSS.atkMulPerSpawn, idx - 1)),
      def: BOSS.base.def + BOSS.defAddPerSpawn * (idx - 1),
      contactCd: BOSS.base.contactCd
    };

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
