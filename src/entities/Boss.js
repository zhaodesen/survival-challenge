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
    this.setScale((BOSS.base.radius * 4.8) / this.width);
    this.play('boss_walk');

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

    const bodyRadius = BOSS.base.radius / this.scaleX;
    this.setCircle(bodyRadius, this.width / 2 - bodyRadius, this.height / 2 - bodyRadius);

    // 技能计时
    this.nextCharge = scene.time.now + BOSS.chargeCd;
    this.nextSummon = scene.time.now + BOSS.summonCd;
    this.nextShock = scene.time.now + BOSS.shockwaveCd;
    this.nextSlam = scene.time.now + BOSS.slamCd;
    this.enraged = false;
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
    const def = this.def * (this.scene.enemyDefMul || 1);
    const real = Math.max(1, amount - def);
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

    // 时间停止:Boss 静止
    if (time < this.scene.timeStopUntil) { this.setVelocity(0, 0); return; }

    if (!player || !player.alive) {
      this.setVelocity(0, 0);
      return;
    }

    let factor = 1;
    if (time < this.slowUntil) factor = this.slowFactor;

    // 狂暴:血量过低时强化(一次性)
    if (!this.enraged && this.hp <= this.maxHp * BOSS.enrageHpRatio) {
      this.enraged = true;
      this.speed *= BOSS.enrageSpeedMul;
      this.atk = Math.round(this.atk * BOSS.enrageAtkMul);
      if (this.aura) this.aura.setTint(0xff2d55);
      this.scene.cameras.main.flash(200, 255, 60, 90);
    }

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

    // 触发冲击波
    if (time >= this.nextShock) {
      this.nextShock = time + BOSS.shockwaveCd;
      this.castShockwave();
    }

    // 触发地面砸击
    if (time >= this.nextSlam) {
      this.nextSlam = time + BOSS.slamCd;
      this.castSlam(player.x, player.y);
    }

    // 默认追踪
    const ang = Math.atan2(player.y - this.y, player.x - this.x);
    const sp = this.speed * factor;
    this.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
  }

  // 冲击波:以 Boss 为中心扩散的环,命中范围内玩家造成伤害
  castShockwave() {
    const sc = this.scene;
    const bx = this.x; const by = this.y;
    const R = BOSS.shockwaveRadius;
    const color = 0xff3d7f;
    const ring = sc.add.circle(bx, by, 20, color, 0).setStrokeStyle(5, color, 0.9).setDepth(7);
    sc.tweens.add({
      targets: ring, radius: R, alpha: 0, duration: BOSS.shockwaveWindup + 250, ease: 'Quad.out',
      onUpdate: () => ring.setStrokeStyle(5, color, ring.alpha),
      onComplete: () => ring.destroy()
    });
    sc.time.delayedCall(BOSS.shockwaveWindup, () => {
      if (!this.active) return;
      const p = sc.player;
      if (p && p.alive && Phaser.Math.Distance.Between(bx, by, p.x, p.y) <= R) {
        sc.tryDamagePlayer(BOSS.shockwaveDamage);
      }
    });
  }

  // 地面砸击:在玩家当前位置预警后落下范围伤害
  castSlam(px, py) {
    const sc = this.scene;
    const R = BOSS.slamRadius;
    const color = 0xffaa00;
    sc.fxTelegraph(px, py, R, color, BOSS.slamWindup, () => {
      sc.fxExplosion(px, py, R, color);
      const p = sc.player;
      if (p && p.alive && Phaser.Math.Distance.Between(px, py, p.x, p.y) <= R) {
        sc.tryDamagePlayer(BOSS.slamDamage);
      }
    });
  }
}
