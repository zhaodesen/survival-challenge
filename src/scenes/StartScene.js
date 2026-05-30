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
      'WASD / 方向键 移动(移动端用左下摇杆)',
      '站上机关即可操控它清怪 —— 同时只能占据一个',
      '怪物从四面八方涌来,撑得越久分数越高',
      '每 30 秒敌人增强一次,每 60 秒出现 Boss'
    ];
    this.add.text(cx, height * 0.58, tips.join('\n'), {
      fontSize: '20px', color: '#aab6c6', align: 'center', lineSpacing: 10
    }).setOrigin(0.5);

    const btn = this.add.text(cx, height * 0.82, '▶  点击开始', {
      fontSize: '34px', fontStyle: 'bold', color: '#0b0e14',
      backgroundColor: '#4fd1ff', padding: { x: 28, y: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut'
    });

    const start = () => {
      this.scene.start('Game');
      this.scene.launch('UI');
    };
    btn.on('pointerdown', start);
    this.input.keyboard.once('keydown-SPACE', start);
  }
}
