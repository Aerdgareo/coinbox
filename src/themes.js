import { BG_COLORS } from './bg-colors.js'

const COLOR_THEMES = [
  {
    id: 'default',
    group: 'color',
    groupName: '配色主题',
    name: '素色',
    sub: '无图案 · 可调色',
    accent: '#7b6cff',
    accent2: '#a78bfa',
    preview: 'linear-gradient(145deg,#0b0d18 0%,#1b2044 58%,#2a2f5e 100%)',
    swatches: ['#7b6cff', '#4fa8ff', '#3fd0a8', '#ff8fb3', '#f2b45a', '#e05b6a']
  },
  {
    id: 'congyu',
    group: 'color',
    groupName: '配色主题',
    name: '雨夜',
    sub: '绿夜 · 雨丝 · 和风',
    accent: '#7fd8b8',
    accent2: '#bdf3e0',
    preview: 'linear-gradient(145deg,#091917 0%,#12332c 55%,#3f8f76 100%)'
  },
  {
    id: 'congyu2',
    group: 'color',
    groupName: '配色主题',
    name: '樱',
    sub: '樱粉 · 夜色 · 和风',
    accent: '#f7a8c4',
    accent2: '#ffd0e0',
    preview: 'linear-gradient(145deg,#1b1018 0%,#3a1e2e 55%,#c4738c 100%)'
  },
  {
    id: 'miku',
    group: 'color',
    groupName: '配色主题',
    name: '极光',
    sub: '冰蓝 · 极光 · 雪',
    accent: '#7fd6ff',
    accent2: '#d2f2ff',
    preview: 'linear-gradient(145deg,#061726 0%,#0d4668 52%,#5fbbe0 100%)'
  },
  {
    id: 'gancheng',
    group: 'color',
    groupName: '配色主题',
    name: '粉紫',
    sub: '暖粉 · 夜色 · 柔光',
    accent: '#ffabd4',
    accent2: '#e0c4ff',
    preview: 'linear-gradient(145deg,#191324 0%,#3d2549 52%,#b07cc4 100%)'
  },
  {
    id: 'gancheng2',
    group: 'color',
    groupName: '配色主题',
    name: '浅蓝',
    sub: '浅蓝 · 水滴 · 夜色',
    accent: '#8fd4ff',
    accent2: '#d8f2ff',
    preview: 'linear-gradient(145deg,#0b1822 0%,#1d3f52 52%,#5b9fc4 100%)'
  },
  {
    id: 'futaba',
    group: 'color',
    groupName: '配色主题',
    name: '蓝黑',
    sub: '深蓝 · 声波 · 夜色',
    accent: '#6f9bff',
    accent2: '#aec9ff',
    preview: 'linear-gradient(145deg,#070c18 0%,#101c3a 52%,#3e63b8 100%)'
  }
]

const PHOTO_GROUPS = [
  { prefix: 'congyu', label: '丛雨', count: 20 },
  { prefix: 'miku', label: '初音未来', count: 9 },
  { prefix: 'snowmiku', label: '雪未来', count: 5 },
  { prefix: 'gancheng', label: '甘城猫猫', count: 17 },
  { prefix: 'gancheng2', label: '猫羽雫', count: 2 },
  { prefix: 'xiaoxue', label: '小雪从小就很可爱', count: 17 },
  { prefix: 'kikyou', label: '桐生桔梗', count: 1 },
  { prefix: 'shiro', label: '白毛合集', count: 4 },
  { prefix: 'fengjin', label: '风堇合集', count: 5 },
  { prefix: 'futaba', label: '双叶凑音', count: 31 },
  { prefix: 'missile', label: 'MISSILE228', count: 6 },
  { prefix: 'unicorn', label: 'Unicorn', count: 1 },
  { prefix: 'holo', label: 'ホロライブ', count: 3 },
  { prefix: 'shino', label: '椎野せら', count: 4 },
  // 原「杂」分组已并入「其他」，未分类素材也放这里
  { prefix: 'other', label: '其他', count: 12 }
]

const PHOTO_THEMES = []
for (let gi = 0; gi < PHOTO_GROUPS.length; gi++) {
  const g = PHOTO_GROUPS[gi]
  for (let i = 1; i <= g.count; i++) {
    const n = ('0' + i).slice(-2)
    const key = g.prefix + '-' + n
    const c = BG_COLORS[key] || ['#7b6cff', '#a78bfa']
    PHOTO_THEMES.push({
      id: 'photo-' + key,
      group: 'photo',
      groupName: g.label,
      name: g.label + ' ' + n,
      sub: '立绘背景',
      bgImage: './backgrounds/' + key + '.webp',
      accent: c[0],
      accent2: c[1],
      preview: 'linear-gradient(145deg,#0d141c,#2a3a4a)'
    })
  }
}

export const THEMES = COLOR_THEMES.concat(PHOTO_THEMES)

export const PHOTO_GROUP_NAMES = PHOTO_GROUPS.map(function (g) {
  return g.label
})

export const BACKGROUND_MODES = [
  { id: 'theme', name: '跟随主题' },
  { id: 'solid', name: '纯色' },
  { id: 'gradient', name: '渐变' },
  { id: 'image', name: '自定义图片' }
]

export const PHOTO_TINTS = [
  { id: 'auto', name: '跟随图片' },
  { id: 'gold', name: '统一金色' },
  { id: 'custom', name: '自定义' }
]

export function getTheme(id) {
  for (let i = 0; i < THEMES.length; i++) {
    if (THEMES[i].id === id) return THEMES[i]
  }
  return THEMES[0]
}