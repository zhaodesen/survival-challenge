import Phaser from 'phaser';

/**
 * StartScene —— 开始界面。点击/触摸/空格开始游戏。
 */
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor('#0b0e14');

    this.add.text(cx, height * 0.28, '主角生存挑战', {
      fontSize: '64px', fontStyle: 'bold', color: '#4fd1ff'
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.42, 'SURVIVAL CHALLENGE', {
      fontSize: '22px', color: '#6b7a90', letterSpacing: 6
    }).setOrigin(0.5);

    const tips = [
      '按住屏幕任意处拖动 = 虚拟摇杆,控制角色移动',
      '站上机关即可操控它清怪 —— 同时只能占据一个',
      '击败敌人掉落火焰/金币/各种增益碎片',
      '怪物一波波涌来,撑得越久分数越高,每 5 关一个 Boss'
    ];
    this.add.text(cx, height * 0.58, tips.join('\n'), {
      fontSize: '20px', color: '#aab6c6', align: 'center', lineSpacing: 10
    }).setOrigin(0.5);

    const btn = this.add.text(cx, height * 0.82, '▶  点击开始', {
      fontSize: '38px', fontStyle: 'bold', color: '#0b0e14',
      backgroundColor: '#4fd1ff', padding: { x: 34, y: 18 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });

    const start = () => {
      this.scene.start('Game');
      this.scene.launch('UI');
    };
    btn.on('pointerdown', start);
  }
}
