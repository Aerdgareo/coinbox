import {
  getState,
  updateSettings,
  updateGoal,
  createGoal,
  deleteGoal,
  setActiveGoal,
  findGoal,
  getBgImage,
  listUserBgs,
  addUserBg,
  removeUserBg,
  getActiveUserBg,
  userBgUsage,
  currentBgKey,
  resetDimForCurrentBg,
  exportData,
  importData,
  resetAll
} from '../state.js'
import { THEMES, BACKGROUND_MODES, PHOTO_GROUP_NAMES, PHOTO_TINTS, getTheme } from '../themes.js'
import { fmtMoney, escapeHtml, openSheet, closeSheet, toast, confirmDialog } from '../ui.js'
import { lighten, darken, dimGradient } from '../appearance.js'
import { enterBgAdjust } from '../bg-transform.js'
import { openGoalEditor } from './goalEditor.js'
import { openBgFitSheet, fitName } from './bgfit.js'
import { APP_VERSION, REPO_URL, RELEASES_URL } from '../version.js'
import { checkLatestRelease, compareVersions, openExternal } from '../updater.js'

export function renderSettings(el) {
  const state = getState()
  const s = state.settings

  el.innerHTML =
    '<div class="card-title" style="padding:2px 4px 8px"><span class="t"><i>🎨</i>外观</span></div>' +
    themeSection(s) +
    accentSection(s) +
    photoTintSection(s) +
    backgroundSection(s) +
    dimSection(s) +
    effectSection(s) +
    '<div class="card-title" style="padding:12px 4px 8px"><span class="t"><i>🎁</i>抽奖</span></div>' +
    drawSection(s) +
    '<div class="card-title" style="padding:12px 4px 8px"><span class="t"><i>🎯</i>目标</span></div>' +
    goalsSection(state) +
    '<div class="card-title" style="padding:12px 4px 8px"><span class="t"><i>💾</i>数据</span></div>' +
    dataSection() +
    aboutSection()

  bind(el)
}

function themeSection(s) {
  const colorList = THEMES.filter(function (t) {
    return t.group === 'color'
  })

  let photoHtml = ''
  for (let i = 0; i < PHOTO_GROUP_NAMES.length; i++) {
    const gname = PHOTO_GROUP_NAMES[i]
    const items = THEMES.filter(function (t) {
      return t.group === 'photo' && t.groupName === gname
    })
    if (!items.length) continue
    const open = items.some(function (t) {
      return t.id === s.theme
    })
    photoHtml +=
      '<div class="theme-group' + (open ? ' open' : '') + '">' +
      '<button class="theme-group-head" data-tg>' +
      '<span class="tg-name">' + gname + '</span>' +
      '<span class="tg-count">' + items.length + ' 张</span>' +
      '<span class="tg-arrow">▾</span>' +
      '</button>' +
      '<div class="theme-group-body">' + gridHtml(items, s.theme) + '</div>' +
      '</div>'
  }

  return (
    '<div class="card">' +
    '<div class="label">配色主题</div>' +
    gridHtml(colorList, s.theme) +
    '<div class="label mt-16">立绘背景 · 按角色分组</div>' +
    photoHtml +
    userBgGroup(s) +
    '<input type="file" id="ub-file" accept="image/*" multiple style="display:none">' +
    '<div class="faint tiny mt-12" style="line-height:1.6">配色主题是纯配色 + 光效背景；立绘背景会把角色图铺满整页，点分组标题展开。</div>' +
    '</div>'
  )
}

function userBgGroup(s) {
  const list = listUserBgs()
  const usage = userBgUsage()
  const active = s.bgMode === 'image' ? getActiveUserBg() : null
  const activeId = active ? active.id : ''
  // 这一组常驻展开：新用户靠它找到「添加图片」入口
  const open = true

  let cards = ''
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    const on = activeId === b.id
    const when = new Date(Number(b.addedAt) || Date.now())
    const date = when.getMonth() + 1 + '-' + when.getDate()
    const size = b.size ? ' · ' + fmtSize(b.size) : ''
    cards +=
      '<div class="theme-card' + (on ? ' active' : '') + '">' +
      '<div class="theme-card-inner" data-usebg="' + b.id + '"' +
      ' style="background:linear-gradient(rgba(6,8,14,0.22),rgba(6,8,14,0.6)),url(&quot;' + (b.thumbUrl || b.url) + '&quot;) center 18%/cover;">' +
      '<span class="tc-check">✓</span>' +
      '<button class="tc-del" data-delbg="' + b.id + '" title="删除这张">×</button>' +
      '<div class="tc-name">' + escapeHtml(b.name) + '</div>' +
      '<div class="tc-sub">自添 · ' + date + size + '</div>' +
      '</div></div>'
  }
  cards +=
    '<div class="theme-card"><div class="theme-card-inner theme-add" data-ub-add>' +
    '<span class="tc-plus">＋</span><span>添加图片</span></div></div>'

  return (
    '<div class="theme-group' + (open ? ' open' : '') + '">' +
    '<button class="theme-group-head" data-tg>' +
    '<span class="tg-name">用户自添</span>' +
    '<span class="tg-count">' + (list.length ? list.length + ' 张' : '空') + '</span>' +
    '<span class="tg-arrow">▾</span>' +
    '</button>' +
    '<div class="theme-group-body">' +
    (list.length
      ? ''
      : '<div class="faint tiny" style="padding:2px 0 8px;line-height:1.6">还没有自己的背景。添加后每张单独保存，可以随时切换或删掉。</div>') +
    '<div class="theme-grid">' + cards + '</div>' +
    '<div class="faint tiny mt-8" style="line-height:1.6">图片压缩后存在本机（IndexedDB，按磁盘算，几百张都放得下），不上传；点卡片左上角 × 可以删掉。' +
    (usage.count ? '当前 ' + usage.count + ' 张，共 ' + fmtSize(usage.bytes) + '。' : '') +
    '</div>' +
    '</div></div>'
  )
}

function gridHtml(list, current) {
  let html = '<div class="theme-grid">'
  for (let i = 0; i < list.length; i++) {
    const t = list[i]
    const on = current === t.id
    const pending = !!t.pending
    const bg = t.bgImage
      ? 'background:linear-gradient(rgba(6,8,14,0.28),rgba(6,8,14,0.55)),url(&quot;' + t.bgImage + '&quot;) center 18%/cover;'
      : 'background:' + t.preview + ';'
    html +=
      '<div class="theme-card' + (on ? ' active' : '') + (pending ? ' pending' : '') + '">' +
      '<div class="theme-card-inner"' +
      (pending ? '' : ' data-theme-id="' + t.id + '"') +
      ' style="' + bg + '">' +
      '<span class="tc-check">✓</span>' +
      '<div class="tc-name">' + t.name + '</div>' +
      '<div class="tc-sub">' + (pending ? '敬请期待 —' : t.sub) + '</div>' +
      '</div></div>'
  }
  html += '</div>'
  return html
}

function photoTintSection(s) {
  let seg = ''
  for (let i = 0; i < PHOTO_TINTS.length; i++) {
    const m = PHOTO_TINTS[i]
    seg +=
      '<button class="seg-item' + (s.photoTint === m.id ? ' active' : '') + '" data-photo-tint="' + m.id + '">' +
      m.name + '</button>'
  }

  return (
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:10px"><span class="t"><i>🎨</i>立绘主题按钮配色</span>' +
    '<span class="faint tiny">按钮 / 进度条 / 弹窗</span></div>' +
    '<div class="seg">' + seg + '</div>' +
    (s.photoTint === 'custom'
      ? '<div class="mt-16"><div class="label">自定义颜色</div>' +
        '<input type="color" id="photo-accent" value="' + (s.photoAccent || '#e8b45c') + '" style="width:100%;height:42px;border:1px solid var(--border);border-radius:12px;background:none"></div>'
      : '') +
    '<div class="faint tiny mt-8">立绘背景默认用图片主色；如果按钮颜色太浅看不清，可以统一成金色或自己选一个。</div>' +
    '</div>'
  )
}

function accentSection(s) {
  if (s.theme !== 'default') return ''
  const theme = THEMES[0]
  let sw = ''
  for (let i = 0; i < theme.swatches.length; i++) {
    const c = theme.swatches[i]
    const on = c.toLowerCase() === String(s.accent).toLowerCase()
    sw += '<button class="swatch' + (on ? ' active' : '') + '" data-accent="' + c + '" style="background:' + c + '"></button>'
  }
  return (
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:10px"><span class="t"><i>🖌</i>调色</span>' +
    '<span class="faint tiny">只作用于「素色」</span></div>' +
    '<div class="label">主色</div>' +
    '<div class="swatches" style="align-items:center">' + sw +
    '<label class="swatch sw-custom" title="自定义主色">' +
    '<input type="color" id="accent-custom" value="' + s.accent + '" aria-label="自定义主色">' +
    '<span class="sw-plus">＋</span>' +
    '</label></div>' +
    '<div class="sw-tip">带 ＋ 的色块可以自选颜色</div>' +
    '<div class="label mt-16">底色</div>' +
    '<div class="swatches" style="align-items:center">' +
    ['#0b0d18', '#101426', '#12161c', '#161016', '#0d1418'].map(function (c) {
      const on = String(s.bgTint).toLowerCase() === c
      return '<button class="swatch' + (on ? ' active' : '') + '" data-tint="' + c + '" style="background:linear-gradient(145deg,' + c + ',' + lighten(c, 0.22) + ')"></button>'
    }).join('') +
    '<label class="swatch sw-custom" title="自定义底色">' +
    '<input type="color" id="tint-custom" value="' + s.bgTint + '" aria-label="自定义底色">' +
    '<span class="sw-plus">＋</span>' +
    '</label></div>' +
    '</div>'
  )
}

function backgroundSection(s) {
  let seg = ''
  for (let i = 0; i < BACKGROUND_MODES.length; i++) {
    const m = BACKGROUND_MODES[i]
    seg += '<button class="seg-item' + (s.bgMode === m.id ? ' active' : '') + '" data-bgmode="' + m.id + '">' + m.name + '</button>'
  }

  let controls = ''
  if (s.bgMode === 'solid') {
    controls =
      '<div class="flex mt-16"><div class="grow"><div class="label">背景颜色</div>' +
      '<input type="color" id="bg-color" value="' + s.bgColor + '" style="width:100%;height:42px;border:1px solid var(--border);border-radius:12px;background:none">' +
      '</div></div>'
  } else if (s.bgMode === 'gradient') {
    const g = s.bgGradient || ['#0b0d18', '#232a52']
    controls =
      '<div class="flex mt-16">' +
      '<div class="grow" style="margin-right:10px"><div class="label">起点色</div>' +
      '<input type="color" id="grad-1" value="' + g[0] + '" style="width:100%;height:42px;border:1px solid var(--border);border-radius:12px;background:none"></div>' +
      '<div class="grow"><div class="label">终点色</div>' +
      '<input type="color" id="grad-2" value="' + g[1] + '" style="width:100%;height:42px;border:1px solid var(--border);border-radius:12px;background:none"></div>' +
      '</div>'
  } else if (s.bgMode === 'image') {
    const cur = getActiveUserBg()
    const count = listUserBgs().length
    controls =
      '<div class="mt-16">' +
      (cur
        ? '<div class="ub-current">' +
          '<div class="ub-thumb" style="background-image:url(&quot;' + (cur.thumbUrl || cur.url) + '&quot;)"></div>' +
          '<div class="ub-meta"><div class="row-title">' + escapeHtml(cur.name) + '</div>' +
          '<div class="row-sub">用户自添 · 共 ' + count + ' 张</div></div></div>'
        : '<div class="faint tiny" style="line-height:1.6">还没添加过图片，点下面按钮加一张。</div>') +
      '<input type="file" id="bg-file" accept="image/*" multiple style="display:none">' +
      '<button class="btn btn-ghost btn-block mt-12" id="bg-pick">添加图片</button>' +
      '<div class="faint tiny mt-8" style="line-height:1.6">可以一次选多张。所有图都在上面「用户自添」分组里，点卡片切换、点 × 删除。</div>' +
      '</div>'
  }

  const zoom = Math.round((Number(s.bgZoom) || 1) * 100)
  const fitRow =
    '<div class="mt-16">' +
    '<button class="btn btn-ghost btn-block" id="bg-fit-open">显示方式 · ' + fitName(s.bgFit) + '</button>' +
    '<div class="faint tiny mt-8">决定立绘 / 图片背景怎么铺满屏幕：铺满裁切、完整显示、模糊、平铺、拉伸。</div>' +
    '</div>' +
    '<div class="mt-16">' +
    '<button class="btn btn-ghost btn-block" id="bg-adjust-open">调整位置与缩放 · ' + zoom + '%</button>' +
    '<div class="faint tiny mt-8">进入后界面会淡出，直接拖动画面平移，滚轮或双指缩放；也可以点右下角 ✥ 按钮。</div>' +
    '</div>'

  return (
    '<div class="card">' +
    '<div class="label">背景</div>' +
    '<div class="seg">' + seg + '</div>' + controls + fitRow +
    '</div>'
  )
}

function previewBg(s) {
  if (s.bgMode === 'image') return getBgImage() || ''
  if (s.bgMode === 'theme') {
    const t = getTheme(s.theme)
    return (t && t.bgImage) || ''
  }
  return ''
}

function dimRow(name, id, min, max, val, unit) {
  return (
    '<div class="dim-row"><span class="dim-k">' + name + '</span>' +
    '<input class="rng" type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="1" value="' + val + '">' +
    '<span class="dim-v" id="' + id + '-v">' + val + unit + '</span></div>'
  )
}

function bgLabel(s) {
  if (s.bgMode === 'image') {
    const b = getActiveUserBg()
    return b ? '用户自添 · ' + b.name : '自定义图片（还没选）'
  }
  if (s.bgMode === 'theme') {
    const t = getTheme(s.theme)
    return t ? t.name : '跟随主题'
  }
  return s.bgMode === 'solid' ? '纯色背景' : '渐变背景'
}

function dimSection(s) {
  const img = previewBg(s)
  const style =
    (img ? 'background-image:url(&quot;' + img + '&quot;);' : '') + '--dim-layer:' + dimGradient(s) + ';'
  const key = currentBgKey()
  const presets = s.dimPresets || {}
  const tuned = !!(key && presets[key])

  return (
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:8px"><span class="t"><i>🕶</i>隐藏界面时的压暗</span>' +
    '<span class="faint tiny">每张背景各存一套</span></div>' +
    '<div class="dim-cur"><span class="dim-cur-name">当前背景：' + escapeHtml(bgLabel(s)) + '</span>' +
    '<span class="dim-cur-tag' + (tuned ? ' on' : '') + '">' + (tuned ? '已单独调过' : '默认值') + '</span></div>' +
    '<div class="dim-pv" id="dim-pv" style="' + style + '">' +
    '<span class="dim-pv-tag">预览 · 虚线是压暗中心</span>' +
    '<i class="dim-pv-dot" id="dim-dot" style="left:' + Math.round(s.dimX) + '%;top:' + Math.round(s.dimY) + '%"></i>' +
    '</div>' +
    dimRow('中心 X', 'dim-x', 0, 100, Math.round(s.dimX), '%') +
    dimRow('中心 Y', 'dim-y', 0, 100, Math.round(s.dimY), '%') +
    dimRow('范围', 'dim-spread', 60, 200, Math.round(s.dimSpread), '%') +
    dimRow('强度', 'dim-strength', 20, 180, Math.round(s.dimStrength), '%') +
    '<button class="btn btn-ghost btn-block mt-12" id="dim-reset">重置这张背景的压暗</button>' +
    '<div class="faint tiny mt-8" style="line-height:1.6">圆心默认在 50% / 20%——人物头部的位置，所以脸最清楚，四周和底部逐渐压暗。虚线圆圈就是圆心；想看真实效果，点右下角 👁 隐藏界面。<br>每张背景（立绘和自添图片都算）单独保存，切回来自动还原；点重置只影响当前这张。</div>' +
    '</div>'
  )
}

const FX_LIST = [
  { id: 'none', name: '无', ico: '∅' },
  { id: 'snow', name: '下雪', ico: '❄' },
  { id: 'stars', name: '群星', ico: '✦' },
  { id: 'notes', name: '音符', ico: '♪' },
  { id: 'sakura', name: '樱花', ico: '❀' }
]

function effectSection(s) {
  let fx = ''
  for (let i = 0; i < FX_LIST.length; i++) {
    const f = FX_LIST[i]
    fx +=
      '<button class="fx-opt' + (s.effect === f.id ? ' active' : '') + '" data-fx="' + f.id + '">' +
      '<span class="fx-ico">' + f.ico + '</span>' +
      '<span class="fx-name">' + f.name + '</span></button>'
  }

  return (
    '<div class="card">' +
    '<div class="card-title" style="margin-bottom:10px"><span class="t"><i>✨</i>氛围特效</span>' +
    '<span class="faint tiny">铺在背景上的一层动画</span></div>' +
    '<div class="fx-grid">' + fx + '</div>' +
    '<div class="faint tiny mt-8">下雪 / 群星闪烁 / 波纹音符 / 樱花飘落，四选一，只在本机渲染，不影响记账。</div>' +
    '<div class="fx-rows mt-8">' +
    row('隐藏界面时压暗', '默认进入黑夜模式，夜里看着不刺眼', switchHtml('hideDim', s.hideDim !== false)) +
    row('粒子效果', '随主题飘落的细小光点', switchHtml('particles', s.particles !== false)) +
    row('减少动画', '低性能设备可开启，同时关掉特效', switchHtml('reduceMotion', !!s.reduceMotion)) +
    '</div>' +
    '</div>'
  )
}

function drawSection(s) {
  let seg = ''
  for (let i = 1; i <= 3; i++) {
    seg += '<button class="seg-item' + (Number(s.dailyDraws) === i ? ' active' : '') + '" data-daily="' + i + '">' + i + ' 次</button>'
  }

  const min = Number(s.drawMin) || 1
  const max = Number(s.drawMax) || 100
  const presets = [
    [1, 10],
    [1, 50],
    [1, 100],
    [5, 100]
  ]

  let presetHtml = ''
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i]
    presetHtml +=
      '<button class="btn btn-ghost btn-sm" data-range="' + p[0] + '-' + p[1] + '" style="margin:4px">' +
      p[0] + '~' + p[1] + ' 元</button>'
  }

  return (
    '<div class="card">' +
    '<div class="label">每天可抽次数（默认 1 次）</div>' +
    '<div class="seg">' + seg + '</div>' +
    '<div class="faint tiny mt-8">每天 0 点重置。改多改少都只影响之后的天数。</div>' +
    '<div class="label mt-16">次数怎么算</div>' +
    '<div class="seg">' +
    '<button class="seg-item' + (s.drawQuota !== 'perGoal' ? ' active' : '') + '" data-quota="shared">全部目标共享</button>' +
    '<button class="seg-item' + (s.drawQuota === 'perGoal' ? ' active' : '') + '" data-quota="perGoal">每个目标各一套</button>' +
    '</div>' +
    '<div class="faint tiny mt-8">共享：几个目标加起来也只有这几次；各一套：每个目标都能单独抽，奖池也按各自目标生成。</div>' +
    '<div class="label mt-16">抽奖金额范围（默认 1 ~ 100 元）</div>' +
    '<div class="flex">' +
    '<div class="grow" style="margin-right:10px">' +
    '<div class="label" style="margin-bottom:5px">最低（元）</div>' +
    '<input class="input" id="draw-min" type="number" inputmode="decimal" min="0.1" step="0.5" value="' + min + '">' +
    '</div>' +
    '<div class="grow">' +
    '<div class="label" style="margin-bottom:5px">最高（元）</div>' +
    '<input class="input" id="draw-max" type="number" inputmode="decimal" min="1" step="1" value="' + max + '">' +
    '</div></div>' +
    '<div style="display:flex;flex-wrap:wrap;margin:2px -4px 0">' + presetHtml + '</div>' +
    '<div class="faint tiny mt-8">奖池按这个范围生成 8 档奖金，首档是下限、末档是上限，中间档位每天重新排布；金额越大越难中。</div>' +
    '<div class="mt-16">' +
    row('提示音', '开箱和中奖时的轻音效', switchHtml('sound', s.sound !== false)) +
    '</div>' +
    '</div>'
  )
}

function goalsSection(state) {
  let list = ''
  for (let i = 0; i < state.goals.length; i++) {
    const g = state.goals[i]
    const on = g.id === state.activeGoal
    list +=
      '<div class="row">' +
      '<div class="row-main">' +
      '<div class="row-icon">' + escapeHtml(g.emoji) + '</div>' +
      '<div class="row-text"><div class="row-title">' + escapeHtml(g.name) + (on ? ' · 当前' : '') + '</div>' +
      '<div class="row-sub">¥' + fmtMoney(g.saved) + ' / ¥' + fmtMoney(g.target) + '</div></div></div>' +
      '<div>' +
      (on ? '' : '<button class="btn btn-ghost btn-sm" data-use-goal="' + g.id + '" style="margin-right:6px">切换</button>') +
      '<button class="btn btn-ghost btn-sm" data-edit-goal-id="' + g.id + '">编辑</button>' +
      '</div></div>'
  }
  return (
    '<div class="card card-tight">' + list +
    '<button class="btn btn-ghost btn-block mt-12" data-new-goal>＋ 新建目标</button>' +
    '</div>'
  )
}

function dataSection() {
  return (
    '<div class="card card-tight">' +
    row('导出备份', '生成一份 JSON，可换设备导入', '<button class="btn btn-ghost btn-sm" data-export>导出</button>') +
    row('导入备份', '从 JSON 恢复目标和记录', '<button class="btn btn-ghost btn-sm" data-import>导入</button>') +
    row('清空数据', '删除全部目标和记录', '<button class="btn btn-ghost btn-sm" data-reset style="color:var(--bad)">清空</button>') +
    '</div>'
  )
}

function aboutSection() {
  return (
    '<div class="card card-tight" style="margin-top:14px">' +
    '<div class="flex-between"><div class="row-title">攒钱盲盒</div><div class="faint tiny">v' + APP_VERSION + '</div></div>' +
    '<div class="faint tiny mt-8" style="line-height:1.7">' +
    '一个纯本地的攒钱小工具：给想要的东西设个目标，每天开一次盲盒，抽到的小奖金会直接加进进度里。<br>' +
    '不付款、不收集任何数据。' +
    '</div>' +
    '<div class="mt-16" style="display:flex">' +
    '<button class="btn btn-ghost btn-sm" id="btn-check-update" style="flex:1;margin-right:8px">检查更新</button>' +
    '<button class="btn btn-ghost btn-sm" id="btn-repo" style="flex:1">开源地址</button>' +
    '</div>' +
    '<div class="faint tiny mt-8" style="line-height:1.6">github.com/Aerdgareo/coinbox</div>' +
    '<div class="label mt-16">素材与致谢</div>' +
    '<div class="faint tiny" style="line-height:1.85">' +
    '丛雨（《千恋＊万花》）、雪未来 2017、甘城なつき / 猫羽雫 的立绘素材来自 B 站公开分享，' +
    '存档页面：《丛雨美图推荐》《小丛雨》《可爱哒初音 雪未来2017篇》。<br>' +
    '角色与画师版权归原权利人所有；双叶凑音立绘来自 pixiv 公开作品（画师 Sumii 等），版权归原画师所有。<br>' +
    '如果你不希望自己的作品出现在这里，可以联系作者移除。' +
    '</div></div>'
  )
}

function row(title, sub, control) {
  return (
    '<div class="row"><div class="row-main"><div class="row-text">' +
    '<div class="row-title">' + title + '</div>' +
    (sub ? '<div class="row-sub">' + sub + '</div>' : '') +
    '</div></div><div>' + control + '</div></div>'
  )
}

function switchHtml(key, on) {
  return '<button class="switch' + (on ? ' on' : '') + '" data-switch="' + key + '" role="switch" aria-checked="' + on + '"></button>'
}

function fxName(id) {
  for (let i = 0; i < FX_LIST.length; i++) {
    if (FX_LIST[i].id === id) return FX_LIST[i].name
  }
  return ''
}

function bind(el) {
  const s = getState().settings

  el.querySelectorAll('[data-tg]').forEach(function (head) {
    head.addEventListener('click', function () {
      const group = head.parentNode
      if (group && group.classList) group.classList.toggle('open')
    })
  })

  el.querySelectorAll('[data-theme-id]').forEach(function (n) {
    n.addEventListener('click', function () {
      const id = n.getAttribute('data-theme-id')
      const t = getTheme(id)
      // 换图后原来的缩放 / 偏移未必适合新构图，一律回到默认
      const patch = { theme: id, bgZoom: 1, bgOffX: 0, bgOffY: 0 }
      // 立绘背景：如果当前不在「跟随主题」，点一下自动切回去，否则点了画面没变化
      if (t && t.bgImage && getState().settings.bgMode !== 'theme') {
        patch.bgMode = 'theme'
        toast('已切到「' + t.name + '」立绘背景')
      }
      updateSettings(patch)
    })
  })

  el.querySelectorAll('[data-photo-tint]').forEach(function (n) {
    n.addEventListener('click', function () {
      updateSettings({ photoTint: n.getAttribute('data-photo-tint') })
    })
  })

  const pa = el.querySelector('#photo-accent')
  if (pa) {
    pa.addEventListener('change', function () {
      updateSettings({ photoAccent: pa.value })
    })
  }

  el.querySelectorAll('[data-accent]').forEach(function (n) {
    n.addEventListener('click', function () {
      updateSettings({ accent: n.getAttribute('data-accent') })
    })
  })

  const ac = el.querySelector('#accent-custom')
  if (ac) ac.addEventListener('change', function () { updateSettings({ accent: ac.value }) })

  el.querySelectorAll('[data-tint]').forEach(function (n) {
    n.addEventListener('click', function () {
      updateSettings({ bgTint: n.getAttribute('data-tint') })
    })
  })

  const tc = el.querySelector('#tint-custom')
  if (tc) tc.addEventListener('change', function () { updateSettings({ bgTint: tc.value }) })

  const fitOpen = el.querySelector('#bg-fit-open')
  if (fitOpen) {
    fitOpen.addEventListener('click', function () {
      openBgFitSheet()
    })
  }

  const adjustOpen = el.querySelector('#bg-adjust-open')
  if (adjustOpen) {
    adjustOpen.addEventListener('click', function () {
      enterBgAdjust()
    })
  }

  // 压暗：拖动时只改预览与图层，松手才写进设置（避免整页重渲染打断拖动）
  const dimMap = [
    ['dim-x', 'dimX'],
    ['dim-y', 'dimY'],
    ['dim-spread', 'dimSpread'],
    ['dim-strength', 'dimStrength']
  ]
  const dimDraft = {
    dimX: Number(s.dimX),
    dimY: Number(s.dimY),
    dimSpread: Number(s.dimSpread),
    dimStrength: Number(s.dimStrength)
  }
  dimMap.forEach(function (pair) {
    const input = el.querySelector('#' + pair[0])
    if (!input) return
    const out = el.querySelector('#' + pair[0] + '-v')
    input.addEventListener('input', function () {
      dimDraft[pair[1]] = Number(input.value)
      if (out) out.textContent = input.value + '%'
      const g = dimGradient(dimDraft)
      const pv = el.querySelector('#dim-pv')
      if (pv) pv.style.setProperty('--dim-layer', g)
      const dot = el.querySelector('#dim-dot')
      if (dot) {
        dot.style.left = Math.round(dimDraft.dimX) + '%'
        dot.style.top = Math.round(dimDraft.dimY) + '%'
      }
      const night = document.getElementById('bgNight')
      if (night) night.style.background = g
    })
    input.addEventListener('change', function () {
      const patch = {}
      patch[pair[1]] = Number(input.value)
      updateSettings(patch)
    })
  })


  el.querySelectorAll('[data-bgmode]').forEach(function (n) {
    n.addEventListener('click', function () {
      updateSettings({ bgMode: n.getAttribute('data-bgmode') })
    })
  })

  const bgColor = el.querySelector('#bg-color')
  if (bgColor) bgColor.addEventListener('change', function () { updateSettings({ bgColor: bgColor.value }) })

  const g1 = el.querySelector('#grad-1')
  const g2 = el.querySelector('#grad-2')
  if (g1 && g2) {
    const applyGrad = function () {
      updateSettings({ bgGradient: [g1.value, g2.value] })
    }
    g1.addEventListener('change', applyGrad)
    g2.addEventListener('change', applyGrad)
  }

  // 用户自添背景：选中 / 删除 / 添加（两个入口共用一个批量导入）
  el.querySelectorAll('[data-usebg]').forEach(function (n) {
    n.addEventListener('click', function () {
      const id = n.getAttribute('data-usebg')
      const cur = getState().settings
      if (cur.bgMode === 'image' && cur.userBgId === id) return
      updateSettings({ bgMode: 'image', userBgId: id, bgZoom: 1, bgOffX: 0, bgOffY: 0 })
      toast('已切换背景')
    })
  })

  el.querySelectorAll('[data-delbg]').forEach(function (n) {
    n.addEventListener('click', function (e) {
      e.stopPropagation()
      const id = n.getAttribute('data-delbg')
      const item = listUserBgs().filter(function (b) {
        return b.id === id
      })[0]
      confirmDialog('删除「' + (item ? item.name : '这张背景') + '」？', '删掉后需要重新添加，其他背景不受影响。', true).then(async function (ok) {
        if (!ok) return
        const wasCurrent = getState().settings.bgMode === 'image' && getState().settings.userBgId === id
        let done = false
        try {
          done = await removeUserBg(id)
        } catch (e) {
          done = false
        }
        if (done) {
          if (wasCurrent) toast('已删除，切换到下一张')
          else toast('已删除')
        } else {
          toast('删除失败，稍后再试')
        }
      })
    })
  })

  const ubFile = el.querySelector('#ub-file')
  el.querySelectorAll('[data-ub-add]').forEach(function (n) {
    n.addEventListener('click', function () {
      if (ubFile) ubFile.click()
    })
  })
  if (ubFile) {
    ubFile.addEventListener('change', function () {
      importBgFiles(ubFile.files)
      ubFile.value = ''
    })
  }

  const file = el.querySelector('#bg-file')
  const pick = el.querySelector('#bg-pick')
  if (pick && file) {
    pick.addEventListener('click', function () { file.click() })
    file.addEventListener('change', function () {
      importBgFiles(file.files)
      file.value = ''
    })
  }

  const dimReset = el.querySelector('#dim-reset')
  if (dimReset) {
    dimReset.addEventListener('click', function () {
      resetDimForCurrentBg()
      toast('这张背景的压暗已恢复默认')
    })
  }

  el.querySelectorAll('[data-fx]').forEach(function (n) {
    n.addEventListener('click', function () {
      const id = n.getAttribute('data-fx')
      updateSettings({ effect: id })
      if (id !== 'none') toast('已开启「' + fxName(id) + '」效果')
    })
  })

  el.querySelectorAll('[data-switch]').forEach(function (n) {
    n.addEventListener('click', function () {
      const key = n.getAttribute('data-switch')
      const cur = n.classList.contains('on')
      const patch = {}
      patch[key] = !cur
      updateSettings(patch)
    })
  })

  el.querySelectorAll('[data-daily]').forEach(function (n) {
    n.addEventListener('click', function () {
      updateSettings({ dailyDraws: Number(n.getAttribute('data-daily')) })
      toast('已设为每天 ' + n.getAttribute('data-daily') + ' 次')
    })
  })

  el.querySelectorAll('[data-quota]').forEach(function (n) {
    n.addEventListener('click', function () {
      const mode = n.getAttribute('data-quota')
      updateSettings({ drawQuota: mode })
      toast(mode === 'perGoal' ? '每个目标各有一套次数' : '所有目标共用今天的次数')
    })
  })

  const dmin = el.querySelector('#draw-min')
  const dmax = el.querySelector('#draw-max')
  if (dmin && dmax) {
    const applyRange = function () {
      const a = Number(dmin.value) || 1
      const b = Number(dmax.value) || 100
      updateSettings({ drawMin: a, drawMax: Math.max(a, b) })
    }
    dmin.addEventListener('change', applyRange)
    dmax.addEventListener('change', applyRange)
  }

  el.querySelectorAll('[data-range]').forEach(function (n) {
    n.addEventListener('click', function () {
      const parts = n.getAttribute('data-range').split('-')
      updateSettings({ drawMin: Number(parts[0]), drawMax: Number(parts[1]) })
      toast('金额范围：' + parts[0] + ' ~ ' + parts[1] + ' 元')
    })
  })

  el.querySelectorAll('[data-use-goal]').forEach(function (n) {
    n.addEventListener('click', function () {
      setActiveGoal(n.getAttribute('data-use-goal'))
      toast('已切换目标')
    })
  })

  el.querySelectorAll('[data-edit-goal-id]').forEach(function (n) {
    n.addEventListener('click', function () {
      openGoalEditor(n.getAttribute('data-edit-goal-id'))
    })
  })

  const ng = el.querySelector('[data-new-goal]')
  if (ng) ng.addEventListener('click', function () { openGoalEditor() })

  const exp = el.querySelector('[data-export]')
  if (exp) exp.addEventListener('click', showExport)

  const imp = el.querySelector('[data-import]')
  if (imp) imp.addEventListener('click', showImport)

  const repoBtn = el.querySelector('#btn-repo')
  if (repoBtn) {
    repoBtn.addEventListener('click', function () {
      openExternal(REPO_URL)
    })
  }

  const updBtn = el.querySelector('#btn-check-update')
  if (updBtn) {
    updBtn.addEventListener('click', function () {
      if (updBtn.disabled) return
      const label = updBtn.textContent
      updBtn.disabled = true
      updBtn.textContent = '检查中…'

      function restore() {
        updBtn.disabled = false
        updBtn.textContent = label
      }

      checkLatestRelease().then(function (info) {
        restore()
        if (!info.latest) {
          toast('没读到版本号，稍后再试试')
          return
        }
        if (compareVersions(info.latest, APP_VERSION) > 0) {
          showUpdateResult(info)
        } else {
          toast('已是最新版本 v' + APP_VERSION)
        }
      }).catch(function (e) {
        restore()
        if (e && e.message === 'timeout') {
          toast('检查超时（8 秒），网络可能不太顺畅', 2400)
        } else if (e && e.message === 'unsupported') {
          toast('当前环境不支持联网检查')
        } else {
          toast('检查失败，请确认网络后重试', 2400)
        }
      })
    })
  }

  const rst = el.querySelector('[data-reset]')
  if (rst) {
    rst.addEventListener('click', function () {
      confirmDialog('清空所有数据', '目标、进度、抽奖记录都会删除，且无法恢复。建议先导出备份。', true).then(async function (ok) {
        if (ok) {
          await resetAll()
          toast('已清空')
        }
      })
    })
  }
}

function showUpdateResult(info) {
  const sheet = openSheet(
    '<div class="text-center" style="padding:2px 2px 0">' +
    '<div class="result-label">发现新版本</div>' +
    '<div class="result-value">v' + escapeHtml(info.latest) + '</div>' +
    '<div class="faint tiny mt-8">当前 v' + APP_VERSION + ' · 来自 GitHub Releases</div>' +
    '</div>' +
    '<button class="btn btn-primary btn-block mt-16" id="upd-go">前往下载</button>' +
    '<button class="btn btn-ghost btn-block mt-12" data-sheet-close>以后再说</button>',
    { title: '检查更新' }
  )
  if (!sheet) return
  sheet.querySelector('#upd-go').addEventListener('click', function () {
    openExternal(info.url || RELEASES_URL)
    closeSheet()
  })
}

async function showExport() {
  const sheet = openSheet(
    '<div class="label">备份内容（可复制保存）</div>' +
    '<textarea class="input" id="exp-text" style="height:160px;font-size:11px" readonly></textarea>' +
    '<div style="display:flex;margin-top:12px">' +
    '<button class="btn btn-ghost" id="exp-copy" style="flex:1;margin-right:10px">复制</button>' +
    '<button class="btn btn-primary" id="exp-download" style="flex:1">下载文件</button>' +
    '</div>',
    { title: '导出备份' }
  )
  if (!sheet) return

  const ta = sheet.querySelector('#exp-text')
  ta.value = '正在把背景图打包进备份，图多的话要几秒…'

  let text = ''
  try {
    text = await exportData()
  } catch (e) {
    text = ''
  }
  ta.value = text || '（导出失败，稍后重试）'

  sheet.querySelector('#exp-copy').addEventListener('click', function () {
    if (!text) {
      toast('还没有内容')
      return
    }
    ta.select()
    try {
      document.execCommand('copy')
      toast('已复制到剪贴板')
    } catch (e) {
      toast('复制失败，请手动选择文本')
    }
  })

  sheet.querySelector('#exp-download').addEventListener('click', function () {
    if (!text) {
      toast('还没有内容')
      return
    }
    try {
      const blob = new Blob([text], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'coinbox-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(a)
      a.click()
      setTimeout(function () {
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)
      }, 1000)
      toast('已开始下载')
    } catch (e) {
      toast('下载失败，请用复制')
    }
  })
}

function showImport() {
  const sheet = openSheet(
    '<div class="label">选择备份文件</div>' +
    '<input type="file" id="imp-file" accept=".json,application/json" style="display:none">' +
    '<button class="btn btn-ghost btn-block" id="imp-pick">选择 JSON 文件</button>' +
    '<div class="label mt-16">或者直接粘贴备份内容</div>' +
    '<textarea class="input" id="imp-text" style="height:120px;font-size:11px" placeholder="粘贴导出的 JSON"></textarea>' +
    '<button class="btn btn-primary btn-block mt-16" id="imp-do">导入并覆盖</button>',
    { title: '导入备份' }
  )
  if (!sheet) return

  const file = sheet.querySelector('#imp-file')
  sheet.querySelector('#imp-pick').addEventListener('click', function () { file.click() })
  file.addEventListener('change', function () {
    const f = file.files && file.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = function () {
      sheet.querySelector('#imp-text').value = String(r.result || '')
    }
    r.readAsText(f)
  })

  sheet.querySelector('#imp-do').addEventListener('click', async function () {
    const text = sheet.querySelector('#imp-text').value
    if (!text) { toast('还没有内容'); return }
    const btn = sheet.querySelector('#imp-do')
    btn.textContent = '正在导入…'
    btn.disabled = true
    let ok = false
    try {
      ok = await importData(text)
    } catch (e) {
      ok = false
    }
    btn.textContent = '导入并覆盖'
    btn.disabled = false
    if (ok) {
      closeSheet()
      toast('导入成功')
    } else {
      toast('这个文件不太对，检查一下')
    }
  })
}

/** 422KB → 412KB / 1.4MB */
function fmtSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return n + 'B'
  if (n < 1048576) return Math.round(n / 1024) + 'KB'
  return (n / 1048576).toFixed(1) + 'MB'
}

/**
 * 导入一张或多张背景：压缩成大图 + 小缩略图，逐张写进 IndexedDB
 */
async function importBgFiles(files) {
  const list = Array.prototype.slice.call(files || [])
  if (!list.length) return

  const total = list.length
  if (total > 1) toast('正在处理 ' + total + ' 张图片…')

  let last = null
  let failed = 0
  let noSpace = 0

  for (let i = 0; i < total; i++) {
    const f = list[i]
    const out = await prepareImageBlob(f)
    if (!out) {
      failed++
      continue
    }
    const name = String(f.name || '').replace(/\.[^./\\]+$/, '').slice(0, 24)
    const item = await addUserBg(out.blob, out.thumbBlob, name)
    if (item) {
      last = item
    } else {
      failed++
      noSpace++
    }
  }

  if (last) {
    updateSettings({ bgMode: 'image', userBgId: last.id, bgZoom: 1, bgOffX: 0, bgOffY: 0 })
  }
  if (failed) {
    if (noSpace) toast('本机空间不足，' + noSpace + ' 张没存上；先删掉几张再加')
    else if (failed === total) toast('这些图读不出来，换几张试试')
    else toast('有 ' + failed + ' 张没读出来，其余已添加')
  } else {
    toast(total > 1 ? '已添加 ' + total + ' 张背景' : '已添加背景')
  }
}

/** 读文件 → 最长边 1440 的 JPEG Blob + 360px 缩略图 Blob */
function prepareImageBlob(file) {
  return new Promise(function (resolve) {
    const reader = new FileReader()
    reader.onerror = function () { resolve(null) }
    reader.onload = function (e) {
      const img = new Image()
      img.onerror = function () { resolve(null) }
      img.onload = function () {
        const max = 1440
        let w = img.width
        let h = img.height
        if (!w || !h) { resolve(null); return }
        if (w > max || h > max) {
          const k = Math.min(max / w, max / h)
          w = Math.round(w * k)
          h = Math.round(h * k)
        }
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        // 列表里的缩略图单独做一份，避免把几百 KB 的大图塞进每一张卡片
        const k2 = Math.min(1, 360 / Math.max(w, h))
        const tc = document.createElement('canvas')
        tc.width = Math.max(1, Math.round(w * k2))
        tc.height = Math.max(1, Math.round(h * k2))
        tc.getContext('2d').drawImage(c, 0, 0, tc.width, tc.height)

        let left = 2
        let blob = null
        let thumbBlob = null
        const done = function () {
          left--
          if (left > 0) return
          if (!blob) {
            resolve(null)
            return
          }
          resolve({ blob: blob, thumbBlob: thumbBlob || blob })
        }
        c.toBlob(function (b) { blob = b; done() }, 'image/jpeg', 0.72)
        tc.toBlob(function (b) { thumbBlob = b; done() }, 'image/jpeg', 0.62)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

