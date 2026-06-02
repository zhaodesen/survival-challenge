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
    this.baseScale = (BOSS.base.radius * 4.8) / this.width;
    this.setScale(this.baseScale);
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
    this.nextAfterimage = 0;
    this.nextHurtFxAt = 0;

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
    const now = this.scene.time.now;
    if (now >= this.nextHurtFxAt) {
      this.nextHurtFxAt = now + 100;
      this.setTintFill(0xffffff);
      this.scene.tweens.killTweensOf(this);
      this.setScale(this.baseScale * 1.08, this.baseScale * 0.92);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScale,
        scaleY: this.baseScale,
        duration: 120,
        ease: 'Back.out'
      });
      this.scene.time.delayedCall(55, () => { if (this.active) this.clearTint(); });
    }
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
        this.rotation = 0;
      } else {
        if (time >= this.nextAfterimage) {
          this.nextAfterimage = time + 75;
          this.scene.fxSpriteAfterimage(this, 0xff3d7f);
        }
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
      const ang = Math.atan2(py - this.y, px - this.x);
      this.rotation = ang * 0.08;
      this.scene.fxBossChargeWindup(this.x, this.y, BOSS.base.radius, 0xffaa00);
      this.scene.fxTelegraphLine(this.x, this.y, px, py, 0xffaa00, BOSS.chargeWindup);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScale * 1.18,
        scaleY: this.baseScale * 0.86,
        duration: BOSS.chargeWindup,
        ease: 'Sine.inOut'
      });
      this.scene.time.delayedCall(BOSS.chargeWindup, () => {
        if (!this.active) return;
        this.state = 'charging';
        this.clearTint();
        this.setScale(this.baseScale);
        const ang = Math.atan2(py - this.y, px - this.x);
        this.chargeVec.set(Math.cos(ang) * BOSS.chargeSpeed, Math.sin(ang) * BOSS.chargeSpeed);
        this.chargeEnd = this.scene.time.now + 650;
      });
      return;
    }

    // 触发召唤
    if (time >= this.nextSummon) {
      this.nextSummon = time + BOSS.summonCd;
      this.castSummon();
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
    const core = sc.add.circle(bx, by, 12, 0xffffff, 0.85).setDepth(16);
    sc.tweens.add({
      targets: ring, radius: R, alpha: 0, duration: BOSS.shockwaveWindup + 250, ease: 'Quad.out',
      onUpdate: () => ring.setStrokeStyle(5, color, ring.alpha),
      onComplete: () => ring.destroy()
    });
    sc.tweens.add({ targets: core, scale: 7, alpha: 0, duration: 420, ease: 'Quad.out', onComplete: () => core.destroy() });
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
    sc.fxTelegraphLine(this.x, this.y, px, py, color, BOSS.slamWindup);
    sc.tweens.add({
      targets: this,
      y: this.y - 20,
      duration: BOSS.slamWindup * 0.45,
      yoyo: true,
      ease: 'Quad.out'
    });
    sc.fxTelegraph(px, py, R, color, BOSS.slamWindup, () => {
      sc.fxSlam(px, py, R, color);
      const p = sc.player;
      if (p && p.alive && Phaser.Math.Distance.Between(px, py, p.x, p.y) <= R) {
        sc.tryDamagePlayer(BOSS.slamDamage);
      }
    });
  }

  castSummon() {
    const sc = this.scene;
    const color = 0xff3d7f;
    sc.fxBossSummon(this.x, this.y, color);
    sc.cameras.main.shake(120, 0.003);
    sc.time.delayedCall(360, () => {
      if (!this.active) return;
      sc.spawnManager.summonAround(this.x, this.y, BOSS.summonCount);
    });
  }
}
