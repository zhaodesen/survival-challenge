import Phaser from 'phaser';
import { PICKUPS } from '../config/balance.js';

/**
 * DropSystem —— 击杀掉落与道具系统。
 * - 击杀有几率掉落:火焰碎片(每 5 关最多 3 个)/ 金币堆 / 各种增益碎片。
 * - 增益碎片拾取即生效;金币堆拾取后在附近生成整齐金币区域,需移动拾取。
 */
export default class DropSystem {
  constructor(scene) {
    this.scene = scene;
    this.items = scene.physics.add.group();   // 增益/火焰/金币堆 碎片
    this.coins = scene.physics.add.group();   // 可拾取金币

    this.fireDropped = 0;
    this.currentBlock = -1;

    scene.physics.add.overlap(scene.player, this.items, this.onItemPickup, null, this);
    scene.physics.add.overlap(scene.player, this.coins, this.onCoinPickup, null, this);
  }

  // ---------- 掉落 ----------
  rollDrop(x, y) {
    const wave = Math.max(1, this.scene.waveManager.wave);
    const block = Math.floor((wave - 1) / 5);
    if (block !== this.currentBlock) { this.currentBlock = block; this.fireDropped = 0; }

    // 火焰碎片(限量)
    if (this.fireDropped < PICKUPS.fireMaxPer5Waves && Math.random() < PICKUPS.fireDropChance) {
      this.spawnItem(x, y, 'fire');
      this.fireDropped += 1;
      return;
    }
    // 其它增益 / 金币堆
    if (Math.random() < PICKUPS.itemDropChance) {
      const kind = weightedPick(PICKUPS.weights);
      this.spawnItem(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), kind);
    }
  }

  spawnItem(x, y, kind) {
    const meta = PICKUPS.meta[kind];
    const f = this.items.create(x, y, `pk_${kind}`);
    f.kind = kind;
    f.setDepth(8);
    f.body.setCircle(PICKUPS.pickupRadius, f.width / 2 - PICKUPS.pickupRadius, f.height / 2 - PICKUPS.pickupRadius);
    f.expireAt = this.scene.time.now + PICKUPS.lifespan;
    f.label = this.scene.add.text(x, y + 22, meta.name, {
      fontSize: '13px', color: '#dfe7f0', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(8);
    this.scene.tweens.add({ targets: f, scale: 1.2, duration: 560, yoyo: true, repeat: -1 });
    this.scene.tweens.add({ targets: f, angle: 360, duration: 2600, repeat: -1 });
  }

  removeItem(item) {
    if (item.label) item.label.destroy();
    this.scene.tweens.killTweensOf(item);
    item.destroy();
  }

  // ---------- 金币堆 ----------
  spawnCoinGrid(cx, cy) {
    const { cols, rows, spacing, radius } = PICKUPS.coinGrid;
    const b = this.scene.physics.world.bounds;
    const startX = cx - ((cols - 1) * spacing) / 2;
    const startY = cy - ((rows - 1) * spacing) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = Phaser.Math.Clamp(startX + c * spacing, b.x + 30, b.right - 30);
        const y = Phaser.Math.Clamp(startY + r * spacing, b.y + 30, b.bottom - 30);
        const coin = this.coins.create(x, y, 'coin');
        coin.value = PICKUPS.coinGrid.value;
        coin.setDepth(7);
        coin.body.setCircle(radius, coin.width / 2 - radius, coin.height / 2 - radius);
        this.scene.tweens.add({ targets: coin, scale: 1.15, duration: 500, yoyo: true, repeat: -1, delay: (r + c) * 40 });
      }
    }
  }

  // ---------- 拾取 ----------
  onItemPickup(player, item) {
    const kind = item.kind;
    const x = item.x; const y = item.y;
    this.removeItem(item);
    this.applyItem(kind, x, y);
  }

  onCoinPickup(player, coin) {
    const v = coin.value || 1;
    this.scene.tweens.killTweensOf(coin);
    coin.destroy();
    this.scene.addCoins(v);
  }

  applyItem(kind, x, y) {
    const s = this.scene;
    const e = PICKUPS.effects;
    switch (kind) {
      case 'fire': s.fireSystem.activateFire(); break;
      case 'coin': this.spawnCoinGrid(x, y); break;
      case 'slowAll': s.applyMassSlow(e.slowAll.factor, e.slowAll.duration); break;
      case 'defDown': s.applyEnemyDefDown(e.defDown.factor, e.defDown.duration); break;
      case 'atkDown': s.applyEnemyAtkDown(e.atkDown.factor, e.atkDown.duration); break;
      case 'kill10': s.killRandomEnemies(e.kill10.count); break;
      case 'atkUp': s.applyAtkUp(e.atkUp.mul, e.atkUp.duration); break;
      case 'invincible': s.applyInvincible(e.invincible.duration); break;
      case 'heal30': s.player.heal(s.player.maxHp * e.heal30.percent); break;
      case 'timeStop': s.applyTimeStop(e.timeStop.duration); break;
      default: break;
    }
    s.events.emit('pickup', PICKUPS.meta[kind].name, PICKUPS.meta[kind].color);
  }

  // ---------- 过期清理 ----------
  update(time) {
    this.items.getChildren().forEach((it) => {
      if (it.active && time > it.expireAt) this.removeItem(it);
    });
  }
}

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[0][0];
}
