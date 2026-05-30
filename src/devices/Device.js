import Phaser from 'phaser';
import { DEVICES } from '../config/balance.js';

/**
 * Device —— 机关基类。
 * 玩家站上去即激活(scene 每帧判定后调用 setActive)。同时只有一个机关被激活。
 * 子类实现 onTick(time, delta) 表达各自的攻击/效果。
 */
export default class Device extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(5);

    this.type = type;
    this.cfg = DEVICES[type];
    this.activated = false;

    // 基座
    this.base = scene.add.image(0, 0, `device_${type}`);
    this.add(this.base);

    // 名称标签
    this.label = scene.add.text(0, DEVICES.baseRadius + 6, this.displayName(), {
      fontSize: '14px', color: '#8aa0bb'
    }).setOrigin(0.5, 0);
    this.add(this.label);

    // 激活光圈(默认隐藏)
    this.glow = scene.add.image(0, 0, 'ring')
      .setTint(this.cfg.color)
      .setScale((DEVICES.baseRadius * 2.2) / 120)
      .setAlpha(0);
    this.addAt(this.glow, 0);

    this.lastTick = 0;
  }

  displayName() {
    return {
      heal: '生命恢复站',
      cannon: '火炮台',
      laser: '激光炮',
      bow: '弓箭',
      thunder: '雷电站',
      slow: '全体减速站'
    }[this.type] || this.type;
  }

  setActivated(on, time) {
    if (on === this.activated) return;
    this.activated = on;
    if (on) {
      this.glow.setAlpha(0.8);
      this.scene.tweens.add({
        targets: this.glow, scale: (DEVICES.baseRadius * 2.6) / 120,
        alpha: 0.4, duration: 600, yoyo: true, repeat: -1
      });
      this.onActivate(time);
    } else {
      this.scene.tweens.killTweensOf(this.glow);
      this.glow.setAlpha(0).setScale((DEVICES.baseRadius * 2.2) / 120);
      this.onDeactivate(time);
    }
  }

  // 子类可重写
  onActivate() {}
  onDeactivate() {}
  onTick() {}

  update(time, delta) {
    if (this.activated) {
      this.onTick(time, delta);
    } else {
      this.onIdleTick(time, delta);
    }
  }

  onIdleTick() {}

  // ---- 子类常用工具 ----

  /** 取范围内最近的敌对目标 */
  nearestHostile(range) {
    const hostiles = this.scene.getHostiles();
    let best = null;
    let bestD = range * range;
    for (const h of hostiles) {
      const d = Phaser.Math.Distance.Squared(this.x, this.y, h.x, h.y);
      if (d <= bestD) { bestD = d; best = h; }
    }
    return best;
  }
}
