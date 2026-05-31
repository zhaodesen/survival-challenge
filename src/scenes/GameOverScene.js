import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(stats) {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor('#0b0e14');
    this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.6);

    this.add.text(cx, height * 0.2, '挑战结束', {
      fontSize: '60px', fontStyle: 'bold', color: '#ff3d7f'
    }).setOrigin(0.5);

    const m = Math.floor(stats.time / 60);
    const s = stats.time % 60;
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

    const lines = [
      `存活时间    ${timeStr}`,
      `到达关数    第 ${stats.wave} 关`,
      `击杀数      ${stats.kills}`,
      `击败 Boss   ${stats.bossKills}`,
      `金币        ${stats.coins}`,
      `最终得分    ${stats.score}`
    ];
    this.add.text(cx, height * 0.46, lines.join('\n'), {
      fontSize: '30px', color: '#e6edf5', align: 'center', lineSpacing: 16
    }).setOrigin(0.5);

    const btn = this.add.text(cx, height * 0.8, '↻  再来一局', {
      fontSize: '36px', fontStyle: 'bold', color: '#0b0e14',
      backgroundColor: '#4fd1ff', padding: { x: 32, y: 16 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const restart = () => {
      this.scene.start('Game');
      this.scene.launch('UI');
    };
    btn.on('pointerdown', restart);
  }
}
