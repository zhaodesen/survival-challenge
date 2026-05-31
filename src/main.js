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
  backgroundColor: '#070b12',
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

function launch() {
  if (window.__GAME_BOOTED__) return;
  window.__GAME_BOOTED__ = true;
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

// 等待主题字体就绪再启动,避免首帧用回退字体
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('700 24px "Chakra Petch"'),
    document.fonts.load('400 24px "Share Tech Mono"'),
    document.fonts.load('400 32px "ZCOOL QingKe HuangYou"')
  ]).then(launch).catch(launch);
  setTimeout(launch, 1200); // 兜底
} else {
  launch();
}
