import Phaser from 'phaser';
import { BOSS } from '../config/balance.js';

/**
 * Boss —— 每 60 秒出场,高血高防,带冲撞与召唤技能。
 */
export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats, spawnIndex) {
    super(scene, x, y, 'boss');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(15);

    this.isBoss = true;
    this.spawnIndex = spawnIndex;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.atk = stats.atk;
    this.def = stats.def;
    this.contactCd = stats.contactCd;
    this.radius = BOSS.base.radius;
    this.lastContact = -9999;
    this.xp = 0;

    this.slowUntil = 0;
    this.slowFactor = 1;

    this.setCircle(BOSS.base.radius, 0, 0);

    // 技能计时
    this.nextCharge = scene.time.now + BOSS.chargeCd;
    this.nextSummon = scene.time.now + BOSS.summonCd;
    this.state = 'chasing'; // chasing | windup | charging
    this.chargeVec = new Phaser.Math.Vector2();
    this.chargeEnd = 0;

    // 光环标识
    this.aura = scene.add.image(x, y, 'ring').setTint(BOSS.base.color)
      .setDepth(14).setAlpha(0.6).setScale(BOSS.base.radius * 2.4 / 120);
  }

  applySlow(factor, until) {
    this.slowFactor = factor;
    this.slowUntil = until;
  }

  takeDamage(amount) {
    const real = Math.max(1, amount - this.def);
    this.hp -= real;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(50, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) return true;
    return false;
  }

  destroyBoss() {
    if (this.aura) this.aura.destroy();
    this.destroy();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    const player = this.scene.player;
    if (this.aura) this.aura.setPosition(this.x, this.y);

    if (!player || !player.alive) {
      this.setVelocity(0, 0);
      return;
    }

    let factor = 1;
    if (time < this.slowUntil) factor = this.slowFactor;

    // 冲撞中
    if (this.state === 'charging') {
      if (time >= this.chargeEnd) {
        this.state = 'chasing';
        this.clearTint();
      } else {
        this.setVelocity(this.chargeVec.x * factor, this.chargeVec.y * factor);
        return;
      }
    }

    // 蓄力中:站定一下,然后冲
    if (this.state === 'windup') {
      this.setVelocity(0, 0);
      return;
    }

    // 触发冲撞
    if (time >= this.nextCharge) {
      this.nextCharge = time + BOSS.chargeCd;
      this.state = 'windup';
      this.setTint(0xffaa00);
      const px = player.x;
      const py = player.y;
      this.scene.time.delayedCall(BOSS.chargeWindup, () => {
        if (!this.active) return;
        this.state = 'charging';
        this.clearTint();
        const ang = Math.atan2(py - this.y, px - this.x);
        this.chargeVec.set(Math.cos(ang) * BOSS.chargeSpeed, Math.sin(ang) * BOSS.chargeSpeed);
        this.chargeEnd = this.scene.time.now + 650;
      });
      return;
    }

    // 触发召唤
    if (time >= this.nextSummon) {
      this.nextSummon = time + BOSS.summonCd;
      this.scene.spawnManager.summonAround(this.x, this.y, BOSS.summonCount);
    }

    // 默认追踪
    const ang = Math.atan2(player.y - this.y, player.x - this.x);
    const sp = this.speed * factor;
    this.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
  }
}
