import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import StartScene from './scenes/StartScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import SkillSelectScene from './scenes/SkillSelectScene.js';
import SkillUpgradeScene from './scenes/SkillUpgradeScene.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#0b0e14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    width: 1280,
    height: 720
  },
  // 移动端:仅触摸输入,关闭键盘,允许多点触控
  input: {
    keyboard: false,
    mouse: true,
    touch: true,
    activePointers: 3
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    pixelArt: false,
    antialias: true
  },
  scene: [BootScene, StartScene, GameScene, UIScene, GameOverScene, UpgradeScene, SkillSelectScene, SkillUpgradeScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
