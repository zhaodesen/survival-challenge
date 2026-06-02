import Phaser from 'phaser';

/**
 * Enemy —— 普通敌人,使用对象池复用(由 SpawnManager 的 group 管理)。
 * spawn() 负责重置属性,deactivate() 回收。
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_grunt');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);

    this.isBoss = false;
    this.typeKey = 'grunt';
    this.maxHp = 1;
    this.hp = 1;
    this.speed = 50;
    this.atk = 5;
    this.def = 0;
    this.contactCd = 600;
    this.lastContact = -9999;
    this.xp = 1;
    this.slowUntil = 0;       // 减速结束时间戳
    this.slowFactor = 1;
    this.baseScale = 1;
    this.nextHurtFxAt = 0;
  }

  /** 从池中激活并设定属性 */
  spawn(x, y, typeKey, stats) {
    this.typeKey = typeKey;
    this.setTexture(`enemy_${typeKey}`);
    this.play(`enemy_${typeKey}_walk`, true);
    this.setPosition(x, y);
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.atk = stats.atk;
    this.def = stats.def;
    this.contactCd = stats.contactCd;
    this.radius = stats.radius;
    this.xp = stats.xp;
    this.lastContact = -9999;
    this.slowUntil = 0;
    this.slowFactor = 1;

    this.setActive(true).setVisible(true);
    this.clearTint();
    this.baseScale = (stats.radius * 5.6) / this.width;
    this.setScale(this.baseScale);
    const body = this.body;
    body.enable = true;
    body.reset(x, y);
    const bodyRadius = stats.radius / this.scaleX;
    this.setCircle(bodyRadius, this.width / 2 - bodyRadius, this.height / 2 - bodyRadius);
    return this;
  }

  applySlow(factor, until) {
    this.slowFactor = factor;
    this.slowUntil = until;
  }

  /** 返回 true 表示死亡 */
  takeDamage(amount) {
    const def = this.def * (this.scene.enemyDefMul || 1);
    const real = Math.max(1, amount - def);
    this.hp -= real;
    // 命中反馈。激光类持续伤害会高频触发,这里做节流。
    const now = this.scene.time.now;
    if (now >= this.nextHurtFxAt) {
      this.nextHurtFxAt = now + 90;
      this.setTintFill(0xffffff);
      this.scene.tweens.killTweensOf(this);
      this.setScale(this.baseScale * 1.12, this.baseScale * 0.88);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScale,
        scaleY: this.baseScale,
        duration: 110,
        ease: 'Back.out'
      });
      this.scene.time.delayedCall(55, () => { if (this.active) this.clearTint(); });
    }
    if (this.hp <= 0) {
      return true;
    }
    return false;
  }

  deactivate() {
    this.setActive(false).setVisible(false);
    if (this.body) this.body.enable = false;
    this.setVelocity(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    // 时间停止:敌人静止
    if (time < this.scene.timeStopUntil) { this.setVelocity(0, 0); return; }

    const target = this.scene.player;
    if (!target || !target.alive) {
      this.setVelocity(0, 0);
      return;
    }

    let factor = 1;
    if (time < this.slowUntil) factor = this.slowFactor;
    // 全场减速(减速站触发期间生成的敌人也受影响)
    if (time < this.scene.activeSlowUntil) factor = Math.min(factor, 0.5);

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const sp = this.speed * factor;
    this.setVelocity(Math.cos(angle) * sp, Math.sin(angle) * sp);
  }
}
