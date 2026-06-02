import Phaser from 'phaser';
import { DEVICES, UPGRADE } from '../config/balance.js';

// 升级弹框中展示的属性行(label, 字段, 单位/格式)
const DISPLAY = {
  cannon: [['攻击力', 'damage', ''], ['攻击间隔', 'interval', 's'], ['爆炸半径', 'radius', 'px'], ['索敌范围', 'range', 'px']],
  laser: [['每秒伤害', 'dps', ''], ['激光长度', 'length', 'px'], ['瞄准间隔', 'retargetMs', 's']],
  bow: [['单体伤害', 'damage', ''], ['射击间隔', 'interval', 's'], ['射程', 'range', 'px']],
  thunder: [['主目标伤害', 'mainDamage', ''], ['触发间隔', 'interval', 's'], ['溅射半径', 'splashRadius', 'px'], ['索敌范围', 'range', 'px']],
  slow: [['减速幅度', 'slowFactor', '%down'], ['持续时间', 'duration', 's'], ['冷却', 'cooldown', 's']]
};

/**
 * Device —— 机关基类。
 * 玩家站上去即激活;点击机关可花金币升级(满级 10 级)。
 * 子类实现 onTick(time, delta) 表达各自的攻击/效果,数值统一读 this.stats。
 */
export default class Device extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(5);

    this.type = type;
    this.cfg = DEVICES[type];
    this.level = 1;
    this.activated = false;
    this.upgradeAvailable = false;
    this.bossRecommended = false;
    this.recomputeStats();

    this.linkGfx = scene.add.graphics().setDepth(4);

    this.controlPad = scene.add.circle(0, 0, DEVICES.controlRadius, this.cfg.color, 0.06)
      .setStrokeStyle(2, this.cfg.color, 0.28)
      .setAlpha(0.75);
    this.add(this.controlPad);

    // 激活光圈(默认隐藏,放最底层)
    this.glow = scene.add.image(0, 0, 'ring')
      .setTint(this.cfg.color)
      .setScale((DEVICES.controlRadius * 1.25) / 120)
      .setAlpha(0);
    this.add(this.glow);

    // 基座(可点击升级)
    this.base = scene.add.image(0, 0, `device_${type}`);
    this.base.setInteractive(new Phaser.Geom.Circle(this.base.width / 2, this.base.height / 2, DEVICES.baseRadius), Phaser.Geom.Circle.Contains);
    this.base.on('pointerdown', () => {
      if (this.scene && this.scene.openUpgrade) this.scene.openUpgrade(this);
    });
    this.add(this.base);

    // 名称标签
    this.label = scene.add.text(0, DEVICES.baseRadius + 18, this.displayName(), {
      fontSize: '14px', color: '#8aa0bb'
    }).setOrigin(0.5, 0);
    this.add(this.label);

    // 等级徽标
    this.levelBadge = scene.add.text(DEVICES.baseRadius - 4, -DEVICES.baseRadius - 4, 'Lv.1', {
      fontSize: '13px', fontStyle: 'bold', color: '#ffe08a', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 1);
    this.add(this.levelBadge);

    this.upgradeHint = scene.add.container(DEVICES.baseRadius + 18, -DEVICES.baseRadius - 22).setVisible(false);
    this.upgradeHintBg = scene.add.circle(0, 0, 15, 0xffd24a, 0.92).setStrokeStyle(2, 0xffffff, 0.9);
    this.upgradeHintTxt = scene.add.text(0, -1, '↑', {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#2a1600'
    }).setOrigin(0.5);
    this.upgradeHint.add([this.upgradeHintBg, this.upgradeHintTxt]);
    this.add(this.upgradeHint);
    scene.tweens.add({ targets: this.upgradeHint, y: this.upgradeHint.y - 5, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.bossHint = scene.add.circle(0, 0, DEVICES.controlRadius + 18, 0xff8a3d, 0)
      .setStrokeStyle(5, 0xff8a3d, 0)
      .setVisible(false);
    this.addAt(this.bossHint, 0);

    this.lastTick = 0;
  }

  displayName() {
    return (DEVICES.info[this.type] && DEVICES.info[this.type].name) || this.type;
  }

  // 按当前等级计算某一级的实际数值
  computeStatsFor(level) {
    const out = { ...this.cfg };
    const L = level - 1;
    UPGRADE.damageKeys.forEach((k) => { if (k in out) out[k] = this.cfg[k] * Math.pow(UPGRADE.damagePerLevel, L); });
    UPGRADE.intervalKeys.forEach((k) => { if (k in out) out[k] = this.cfg[k] * Math.pow(UPGRADE.intervalPerLevel, L); });
    UPGRADE.rangeKeys.forEach((k) => { if (k in out) out[k] = this.cfg[k] * Math.pow(UPGRADE.rangePerLevel, L); });
    return out;
  }

  recomputeStats() {
    this.stats = this.computeStatsFor(this.level);
  }

  get isMaxLevel() {
    return this.level >= UPGRADE.maxLevel;
  }

  /** 升一级(由 UpgradeScene 调用,金币校验在外部完成) */
  upgrade() {
    if (this.isMaxLevel) return false;
    this.level += 1;
    this.recomputeStats();
    if (this.levelBadge) {
      this.levelBadge.setText(this.isMaxLevel ? 'MAX⚡自动' : `Lv.${this.level}`);
      if (this.isMaxLevel) this.levelBadge.setColor('#ff9f43');
    }
    // 升级反馈
    if (this.scene) {
      const ring = this.scene.add.circle(this.x, this.y, DEVICES.baseRadius, this.cfg.color, 0.5).setDepth(6);
      this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    }
    return true;
  }

  /** 返回某一级的展示属性行 [{label, text}] */
  statRows(level) {
    const s = this.computeStatsFor(level);
    const defs = DISPLAY[this.type] || [];
    return defs.map(([label, key, unit]) => {
      let v = s[key];
      let text;
      if (unit === 's') text = `${(v / 1000).toFixed(2)}s`;
      else if (unit === 'px') text = `${Math.round(v)}`;
      else if (unit === '%down') text = `-${Math.round((1 - v) * 100)}%`;
      else text = `${Math.round(v)}`;
      return { label, text };
    });
  }

  setActivated(on, time) {
    if (!this.scene) return;
    if (on === this.activated) return;
    this.activated = on;
    if (on) {
      this.glow.setAlpha(0.8);
      this.scene.tweens.add({
        targets: this.glow, scale: (DEVICES.controlRadius * 1.5) / 120,
        alpha: 0.34, duration: 640, yoyo: true, repeat: -1
      });
      this.scene.tweens.add({
        targets: this.base,
        scale: 1.08,
        duration: 180,
        yoyo: true,
        ease: 'Back.out'
      });
      this.controlPad.setFillStyle(this.cfg.color, 0.12).setStrokeStyle(3, this.cfg.color, 0.72);
      this.label.setColor('#ffffff');
      this.onActivate(time);
    } else {
      this.scene.tweens.killTweensOf(this.glow);
      this.glow.setAlpha(0).setScale((DEVICES.controlRadius * 1.25) / 120);
      this.controlPad.setFillStyle(this.cfg.color, 0.06).setStrokeStyle(2, this.cfg.color, 0.28);
      this.label.setColor('#8aa0bb');
      this.linkGfx.clear();
      this.onDeactivate(time);
    }
  }

  setUpgradeAvailable(on) {
    if (this.upgradeAvailable === on) return;
    this.upgradeAvailable = on;
    this.upgradeHint.setVisible(on);
    if (on) {
      this.scene.tweens.add({
        targets: this.base,
        scale: 1.1,
        duration: 140,
        yoyo: true,
        ease: 'Back.out'
      });
    }
  }

  setBossRecommended(on) {
    if (this.bossRecommended === on) return;
    this.bossRecommended = on;
    this.bossHint.setVisible(on);
    if (!on) {
      this.scene.tweens.killTweensOf(this.bossHint);
      this.bossHint.setAlpha(1).setScale(1).setStrokeStyle(5, 0xff8a3d, 0);
      return;
    }
    this.bossHint.setAlpha(1).setScale(0.92).setStrokeStyle(5, 0xff8a3d, 0.82);
    this.scene.tweens.add({
      targets: this.bossHint,
      scale: 1.12,
      alpha: 0.35,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      onUpdate: () => this.bossHint.setStrokeStyle(5, 0xff8a3d, this.bossHint.alpha)
    });
  }

  // 子类可重写
  onActivate() {}
  onDeactivate() {}
  onTick() {}

  update(time, delta) {
    this.updateUpgradeHint();
    this.updateControlLink();
    if (this.activated) {
      this.onTick(time, delta);
    } else {
      this.onIdleTick(time, delta);
    }
  }

  onIdleTick() {}

  updateUpgradeHint() {
    if (!this.upgradeHint.visible) return;
    const pulse = 0.82 + Math.sin(this.scene.time.now / 120) * 0.18;
    this.upgradeHintBg.setAlpha(pulse);
  }

  updateControlLink() {
    if (!this.linkGfx || !this.scene || !this.scene.player) return;
    this.linkGfx.clear();
    if (!this.activated || this.isMaxLevel) return;
    const p = this.scene.player;
    const pulse = 0.45 + 0.2 * Math.sin(this.scene.time.now / 120);
    this.linkGfx.lineStyle(4, this.cfg.color, pulse);
    this.linkGfx.lineBetween(this.x, this.y, p.x, p.y);
    this.linkGfx.lineStyle(1.5, 0xffffff, pulse + 0.15);
    this.linkGfx.lineBetween(this.x, this.y, p.x, p.y);
  }

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

  destroy(fromScene) {
    if (this.linkGfx) {
      this.linkGfx.destroy();
      this.linkGfx = null;
    }
    super.destroy(fromScene);
  }
}
