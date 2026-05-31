import Phaser from 'phaser';
import { PLAYER } from '../config/balance.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.42);
    const bodyRadius = PLAYER.radius / this.scaleX;
    this.setCircle(bodyRadius, this.width / 2 - bodyRadius, this.height / 2 - bodyRadius);
    this.setCollideWorldBounds(true);
    this.setDepth(20);
    this.play('player_walk');

    this.maxHp = PLAYER.maxHp;
    this.hp = PLAYER.maxHp;
    this.speed = PLAYER.speed;
    this.lastHurt = -9999;
    this.alive = true;

    // 移动输入向量(由 GameScene 每帧填充)
    this.moveVec = new Phaser.Math.Vector2(0, 0);
  }

  setMove(vx, vy) {
    this.moveVec.set(vx, vy);
  }

  takeDamage(amount, time) {
    if (!this.alive) return;
    if (time - this.lastHurt < PLAYER.hurtInvuln) return;
    this.lastHurt = time;
    this.hp = Math.max(0, this.hp - amount);

    // 受击反馈:闪红
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => this.clearTint());
    this.scene.cameras.main.shake(80, 0.004);

    if (this.hp <= 0) {
      this.alive = false;
      this.emit('died');
    }
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.alive) {
      this.setVelocity(0, 0);
      return;
    }
    const v = this.moveVec;
    if (v.lengthSq() > 0) {
      v.normalize().scale(this.speed);
      this.setVelocity(v.x, v.y);
    } else {
      this.setVelocity(0, 0);
    }
  }
}
