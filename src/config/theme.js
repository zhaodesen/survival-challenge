/**
 * theme.js —— 全局视觉主题(HOLO-ARENA 全息战术风)。
 * 统一色板与字体,供所有场景引用,保证画面一致性。
 */

export const COLORS = {
  // 底色与氛围
  bg: 0x070b12,
  bgCss: '#070b12',
  panel: 0x0d1622,
  panelCss: '#0d1622',
  grid: 0x10202e,
  gridBright: 0x1b3142,
  frame: 0x274055,
  frameCss: '#274055',

  // 主色
  cyan: 0x46e6ff,
  cyanCss: '#46e6ff',
  cyanDim: 0x2a7d92,
  amber: 0xffb74d,
  amberCss: '#ffb74d',
  gold: 0xffd24a,
  goldCss: '#ffd24a',
  danger: 0xff3d6e,
  dangerCss: '#ff3d6e',
  green: 0x4be08a,
  greenCss: '#4be08a',

  // 文本
  text: 0xe6f1ff,
  textCss: '#e6f1ff',
  muted: 0x6b8299,
  mutedCss: '#6b8299',
  ink: 0x070b12,
  inkCss: '#070b12'
};

export const FONTS = {
  // 中文标题:海报体
  title: '"ZCOOL QingKe HuangYou", "PingFang SC", "Microsoft YaHei", sans-serif',
  // UI 通用:科技感无衬线
  display: '"Chakra Petch", "PingFang SC", "Microsoft YaHei", sans-serif',
  // 数字 / 计时 / 终端读数:等宽磷光
  mono: '"Share Tech Mono", "Chakra Petch", monospace'
};
