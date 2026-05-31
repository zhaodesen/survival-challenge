import Phaser from 'phaser';
import { SKILL, DEVICES } from '../config/balance.js';

/**
 * SkillUpgradeScene —— 技能升级弹框(点击右侧技能图标打开)。
 * 每 10 金币升级一次,巨幅提升能力。
 */
export default class SkillUpgradeScene extends Phaser.Scene {
  constructor() {
    super('SkillUpgrade');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.game_ = this.scene.get('Game');
    this.sys_ = this.game_.skills;

    this.scene.pause('Game');
    this.scene.pause('UI');

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setInteractive();

    const pw = 640; const ph = 470;
    this.add.rectangle(W / 2, H / 2, pw, ph, 0x141a26, 0.98).setStrokeStyle(3, 0xffd24a);
    const top = H / 2 - ph / 2;
    this.add.text(W / 2, top + 26, '技能升级', { fontSize: '30px', fontStyle: 'bold', color: '#ffd24a' }).setOrigin(0.5);
    this.coinText = this.add.text(W / 2, top + 60, '', { fontSize: '17px', color: '#ffd24a' }).setOrigin(0.5);

    // 关闭
    const x = this.add.text(W / 2 + pw / 2 - 22, top + 18, '✕', { fontSize: '24px', color: '#8aa0bb' })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    x.on('pointerdown', () => this.close());

    this.rows = this.add.container(0, 0);
    this.render();
  }

  render() {
    const W = this.scale.width;
    const top = this.scale.height / 2 - 235;
    this.coinText.setText(`持有金币:${this.game_.coins}`);
    this.rows.removeAll(true);

    const skills = this.sys_.skills;
    const startY = top + 110;
    const rowH = 110;

    skills.forEach((sk, i) => {
      const y = startY + i * rowH;
      const info = DEVICES.info[sk.type];
      const color = DEVICES[sk.type].color;
      const isMax = sk.level >= SKILL.maxLevel;

      this.rows.add(this.add.image(W / 2 - 270, y, `device_${sk.type}`).setScale(0.9));
      this.rows.add(this.add.text(W / 2 - 230, y - 22, `${info.name}  Lv.${sk.level}${isMax ? ' (满)' : ''}`, { fontSize: '20px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5));

      const cur = this.sys_.statRows(sk.type, sk.level);
      const nxt = isMax ? null : this.sys_.statRows(sk.type, sk.level + 1);
      const txt = cur.map((r, k) => `${r.label} ${r.text}${nxt ? ' → ' + nxt[k].text : ''}`).join('   ');
      this.rows.add(this.add.text(W / 2 - 230, y + 8, txt, { fontSize: '14px', color: '#9fdcff' }).setOrigin(0, 0.5));

      // 升级按钮
      const ok = !isMax && this.game_.coins >= SKILL.cost;
      const btn = this.add.rectangle(W / 2 + 230, y, 150, 48, isMax ? 0x44506a : (ok ? 0x4fd1ff : 0x44506a)).setInteractive({ useHandCursor: true });
      const btnT = this.add.text(W / 2 + 230, y, isMax ? '已满级' : `${SKILL.cost}金币升级`, { fontSize: '17px', fontStyle: 'bold', color: '#0b0e14' }).setOrigin(0.5);
      btn.on('pointerdown', () => this.tryUpgrade(i));
      this.rows.add(btn); this.rows.add(btnT);
    });
  }

  tryUpgrade(i) {
    if (this.sys_.isMax(i)) return;
    if (this.game_.coins < SKILL.cost) {
      this.coinText.setText(`金币不足!需要 ${SKILL.cost}(当前 ${this.game_.coins})`).setColor('#ff6b6b');
      this.tweens.add({ targets: this.coinText, alpha: 0.3, duration: 120, yoyo: true, repeat: 2, onComplete: () => this.coinText.setColor('#ffd24a') });
      return;
    }
    this.game_.coins -= SKILL.cost;
    this.sys_.upgrade(i);
    this.cameras.main.flash(120, 80, 200, 255);
    this.render();
  }

  close() {
    this.scene.resume('Game');
    this.scene.resume('UI');
    this.scene.stop();
  }
}
