import {
  getState,
  updateSettings,
  updateGoal,
  createGoal,
  deleteGoal,
  setActiveGoal,
  findGoal,
  getBgImage,
  setBgImage,
  exportData,
  importData,
  resetAll
} from '../state.js'
import { THEMES, BACKGROUND_MODES, PHOTO_GROUP_NAMES, PHOTO_TINTS } from '../themes.js'
import { fmtMoney, escapeHtml, openSheet, closeSheet, toast, confirmDialog } from '../ui.js'
import { lighten, darken } from '../appearance.js'
import { openGoalEditor } from './goalEditor.js'
import { openBgFitSheet, fitName } from './bgfit.js'

export function renderSettings(el) {
  const state = getState()
  const s = state.settings

  el.innerHTML =
    '<div class="card-title" style="padding:2px 4px 8px"><span class="t"><i>🎨</i>外观</span></div>' +
    themeSection(s) +
    accentSection(s) +
    photoTintSection(s) +
    backgroundSection(s) +
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
    '<div class="faint tiny mt-12" style="line-height:1.6">配色主题是纯配色 + 光效背景；立绘背景会把角色图铺满整页，点分组标题展开。没有素材的分类显示「敬请期待」。</div>' +
    '</div>'
  )
}

function gridHtml(list, current) {
  let html = '<div class="theme-grid">'
  for (let i = 0; i < list.length; i++) {
    const t = list[i]
    const on = current === t.id
    const pending = !!t.pending
    const bg = t.bgImage
      ? 'background:linear-gradient(rgba(6,8,14,0.28),rgba(6,8,14,0.55)),url("' + t.bgImage + '") center/cover;'
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
    '<label class="swatch" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);overflow:hidden">' +
    '<input type="color" id="accent-custom" value="' + s.accent + '" style="width:46px;height:46px;border:0;background:none;padding:0;margin:-6px">' +
    '</label></div>' +
    '<div class="label mt-16">底色</div>' +
    '<div class="swatches" style="align-items:center">' +
    ['#0b0d18', '#101426', '#12161c', '#161016', '#0d1418'].map(function (c) {
      const on = String(s.bgTint).toLowerCase() === c
      return '<button class="swatch' + (on ? ' active' : '') + '" data-tint="' + c + '" style="background:linear-gradient(145deg,' + c + ',' + lighten(c, 0.22) + ')"></button>'
    }).join('') +
    '<label class="swatch" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);overflow:hidden">' +
    '<input type="color" id="tint-custom" value="' + s.bgTint + '" style="width:46px;height:46px;border:0;background:none;padding:0;margin:-6px">' +
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
    const has = !!getBgImage()
    controls =
      '<div class="mt-16">' +
      '<input type="file" id="bg-file" accept="image/*" style="display:none">' +
      '<button class="btn btn-ghost btn-block" id="bg-pick">' + (has ? '更换图片' : '选择图片') + '</button>' +
      (has ? '<button class="btn btn-ghost btn-block mt-8" id="bg-clear" style="color:var(--bad)">移除图片</button>' : '') +
      '<div class="faint tiny mt-8">图片会压缩后存在本机，不会上传。</div>' +
      '</div>'
  }

  const fitRow =
    '<div class="mt-16">' +
    '<button class="btn btn-ghost btn-block" id="bg-fit-open">显示方式 · ' + fitName(s.bgFit) + '</button>' +
    '<div class="faint tiny mt-8">决定立绘 / 图片背景怎么铺满屏幕：铺满裁切、完整显示、模糊、平铺、拉伸。</div>' +
    '</div>'

  return (
    '<div class="card">' +
    '<div class="label">背景</div>' +
    '<div class="seg">' + seg + '</div>' + controls + fitRow +
    '</div>'
  )
}

function effectSection(s) {
  return (
    '<div class="card card-tight">' +
    row('粒子效果', '随主题飘落的细小光点', switchHtml('particles', s.particles !== false)) +
    row('减少动画', '低性能设备可开启', switchHtml('reduceMotion', !!s.reduceMotion)) +
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
    '<div class="faint tiny mt-8">奖池按这个范围生成 4 档奖金（小 / 中 / 大 / 超大），金额越大越难中。</div>' +
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
    '<div class="flex-between"><div class="row-title">攒钱盲盒</div><div class="faint tiny">v1.0.0</div></div>' +
    '<div class="faint tiny mt-8" style="line-height:1.7">' +
    '一个纯本地的攒钱小工具：给想要的东西设个目标，每天开一次盲盒，抽到的小奖金会直接加进进度里。<br>' +
    '不联网、不付款、不收集任何数据。' +
    '</div>' +
    '<div class="label mt-16">素材与致谢</div>' +
    '<div class="faint tiny" style="line-height:1.85">' +
    '丛雨（《千恋＊万花》）、雪未来 2017、甘城なつき / 猫羽雫 的立绘素材来自 B 站公开分享，' +
    '存档页面：《丛雨美图推荐》《小丛雨》《可爱哒初音 雪未来2017篇》。<br>' +
    '角色与画师版权归原权利人所有；双叶凑音为内置原创风格化绘制。<br>' +
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
      updateSettings({ theme: n.getAttribute('data-theme-id') })
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

  const file = el.querySelector('#bg-file')
  const pick = el.querySelector('#bg-pick')
  if (pick && file) {
    pick.addEventListener('click', function () { file.click() })
    file.addEventListener('change', function () {
      const f = file.files && file.files[0]
      if (!f) return
      compressImage(f, function (data) {
        setBgImage(data)
        updateSettings({ bgMode: 'image' })
        toast('背景已更新')
      })
    })
  }

  const clearBg = el.querySelector('#bg-clear')
  if (clearBg) {
    clearBg.addEventListener('click', function () {
      setBgImage('')
      updateSettings({ bgMode: 'theme' })
      toast('已移除背景图片')
    })
  }

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

  const rst = el.querySelector('[data-reset]')
  if (rst) {
    rst.addEventListener('click', function () {
      confirmDialog('清空所有数据', '目标、进度、抽奖记录都会删除，且无法恢复。建议先导出备份。', true).then(function (ok) {
        if (ok) {
          resetAll()
          toast('已清空')
        }
      })
    })
  }
}

function showExport() {
  const text = exportData()
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
  sheet.querySelector('#exp-text').value = text

  sheet.querySelector('#exp-copy').addEventListener('click', function () {
    const ta = sheet.querySelector('#exp-text')
    ta.select()
    try {
      document.execCommand('copy')
      toast('已复制到剪贴板')
    } catch (e) {
      toast('复制失败，请手动选择文本')
    }
  })

  sheet.querySelector('#exp-download').addEventListener('click', function () {
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

  sheet.querySelector('#imp-do').addEventListener('click', function () {
    const text = sheet.querySelector('#imp-text').value
    if (!text) { toast('还没有内容'); return }
    if (importData(text)) {
      closeSheet()
      toast('导入成功')
    } else {
      toast('这个文件不太对，检查一下')
    }
  })
}

function compressImage(file, cb) {
  const reader = new FileReader()
  reader.onload = function (e) {
    const img = new Image()
    img.onload = function () {
      const max = 1440
      let w = img.width
      let h = img.height
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
      cb(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = function () { toast('这张图读不出来') }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}
