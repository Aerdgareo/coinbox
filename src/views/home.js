import { activeGoal, drawRemaining, addSaving, setActiveGoal, getState } from '../state.js'
import { fmtMoney, fmtPct, escapeHtml, openSheet, closeSheet, toast } from '../ui.js'
import { openDraw } from './draw.js'
import { openGoalEditor } from './goalEditor.js'
import { TIER_KEYS, TIER_LABEL } from '../draw.js'
import { showCongrats } from '../congrats.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function heroBlock(state) {
  const remain = drawRemaining()
  const sub = remain > 0 ? '今天还有 ' + remain + ' 次盲盒，去试试手气' : '今天的盲盒开完啦，明天再来'

  return (
    '<div class="hero no-char">' +
    '<div class="hero-text">' +
    '<div class="hero-hi">' + greeting() + '</div>' +
    '<div class="hero-sub">' + sub + '</div>' +
    '</div></div>'
  )
}

function childList(g) {
  const kids = (g.children || []).slice().sort(function (a, b) {
    return (a.priority || 99) - (b.priority || 99)
  })
  if (!kids.length) return ''
  let html = '<div class="child-box">'
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]
    const pct = Math.min(100, (c.saved / c.target) * 100)
    const done = c.saved >= c.target
    const fill = pct > 0 && pct < 1.5 ? 1.5 : pct
    html +=
      '<div class="child-item">' +
      '<div class="flex-between">' +
      '<span class="child-name">' + escapeHtml(c.name) + '</span>' +
      '<span class="child-right">' +
      '<span class="child-priority">P' + (c.priority || i + 1) + '</span>' +
      '<span class="child-pct' + (done ? ' done' : '') + '">' + (done ? '已达成' : pct.toFixed(0) + '%') + '</span>' +
      '</span></div>' +
      '<div class="progress thin mt-8"><div class="progress-fill" style="width:' + fill.toFixed(2) + '%"></div></div>' +
      '<div class="faint tiny mt-8">¥' + fmtMoney(c.saved) + ' / ¥' + fmtMoney(c.target) + '</div>' +
      '</div>'
  }
  html += '</div>'
  return html
}

function percentOf(g) {
  if (!g || g.target <= 0) return 0
  return Math.min(100, (g.saved / g.target) * 100)
}

function goalCard(g) {
  const pct = percentOf(g)
  const fill = pct > 0 && pct < 1.5 ? 1.5 : pct
  const rest = Math.max(0, g.target - g.saved)
  const done = g.saved >= g.target

  return (
    '<div class="card">' +
    '<div class="goal-head">' +
    '<div class="goal-name"><span class="goal-emoji">' +
    escapeHtml(g.emoji) +
    '</span>' +
    escapeHtml(g.name) +
    '</div>' +
    '<button class="icon-btn" data-edit-goal style="width:32px;height:32px;margin-left:0;font-size:14px">✎</button>' +
    '</div>' +
    '<div class="goal-amount"><span class="unit">¥</span>' +
    fmtMoney(g.saved) +
    (done
      ? '<span class="rest">已达成 🎉</span>'
      : '<span class="rest">还差 ¥' + fmtMoney(rest) + '</span>') +
    '</div>' +
    '<div class="progress mt-12"><div class="progress-fill" style="width:' + fill.toFixed(2) + '%"></div></div>' +
    '<div class="goal-meta"><span>目标 <b>¥' + fmtMoney(g.target) + '</b></span>' +
    '<span class="goal-pct">' + pct.toFixed(pct >= 10 ? 0 : 1) + '%</span></div>' +
    childList(g) +
    '<div style="display:flex;margin-top:14px">' +
    '<button class="btn btn-ghost btn-sm" data-add-saving style="flex:1;margin-right:8px">＋ 记一笔</button>' +
    '<button class="btn btn-ghost btn-sm" data-goal-detail style="flex:1">目标详情</button>' +
    '</div>' +
    '</div>'
  )
}

function drawCard(state) {
  const remain = drawRemaining()
  const total = state.settings.dailyDraws
  const tiers = state.draw.tiers
  const available = remain > 0

  return (
    '<div class="card">' +
    '<div class="draw-entry">' +
    '<div class="draw-entry-info">' +
    '<div class="h">今天的盲盒</div>' +
    '<div class="s">每天 ' + total + ' 次 · 攒钱路上的一点小惊喜</div>' +
    '<div class="draw-badge"><span class="dot' + (available ? '' : ' off') + '"></span>' +
    (available ? '今日还剩 ' + remain + ' 次' : '今天的次数用完了，明天再来') +
    '</div>' +
    '</div>' +
    '<button class="btn btn-primary' + (available ? '' : ' btn-ghost') + '" data-open-draw ' +
    (available ? '' : 'disabled') + '>' +
    (available ? '开 盲 盒' : '已用完') +
    '</button>' +
    '</div>' +
    (tiers
      ? '<div class="tiers mt-16">' +
        TIER_KEYS.map(function (k) {
          return tierCell(TIER_LABEL[k], tiers[k], '')
        }).join('') +
        '</div>' +
        '<div class="faint tiny mt-12">金额越大，抽中的概率越小；攒得越多，大奖概率越低。没中也有 ¥0.1 安慰奖，0 点刷新。</div>'
      : '') +
    '</div>'
  )
}

function tierCell(label, tier, dot) {
  return (
    '<div class="tier">' +
    '<div class="t-amount">¥' + fmtMoney(tier.amount) + '</div>' +
    '<div class="t-pct">' + fmtPct(tier.chance) + ' 概率</div>' +
    '<div class="t-tag">' + label + '</div>' +
    '</div>'
  )
}

function chips(state) {
  let html = '<div class="chips">'
  for (let i = 0; i < state.goals.length; i++) {
    const g = state.goals[i]
    const on = g.id === state.activeGoal
    html +=
      '<button class="chip' + (on ? ' active' : '') + '" data-goal="' + g.id + '">' +
      '<span class="e">' + escapeHtml(g.emoji) + '</span>' + escapeHtml(g.name) +
      '</button>'
  }
  html += '<button class="chip add" data-new-goal>＋ 新目标</button></div>'
  return html
}

export function renderHome(el) {
  const state = getState()
  const g = activeGoal()

  el.innerHTML =
    heroBlock(state) +
    chips(state) +
    goalCard(g) +
    drawCard(state) +
    '<div class="faint tiny text-center" style="padding:4px 10px 2px;line-height:1.7">' +
    '本地记账 · 不涉及真实支付<br>抽到的奖金会直接加进目标进度' +
    '</div>'

  el.querySelectorAll('[data-goal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveGoal(btn.getAttribute('data-goal'))
    })
  })

  const newBtn = el.querySelector('[data-new-goal]')
  if (newBtn) newBtn.addEventListener('click', function () { openGoalEditor() })

  const editBtn = el.querySelector('[data-edit-goal]')
  if (editBtn) editBtn.addEventListener('click', function () { openGoalEditor(g.id) })

  const detailBtn = el.querySelector('[data-goal-detail]')
  if (detailBtn) detailBtn.addEventListener('click', function () { openGoalEditor(g.id) })

  const addBtn = el.querySelector('[data-add-saving]')
  if (addBtn) addBtn.addEventListener('click', function () { openSavingSheet(g.id) })

  const drawBtn = el.querySelector('[data-open-draw]')
  if (drawBtn) drawBtn.addEventListener('click', function () { openDraw() })
}

function openSavingSheet(goalId) {
  const sheet = openSheet(
    '<div class="field"><div class="label">这次往目标里存了多少？</div>' +
    '<input class="input" id="save-amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00"></div>' +
    '<div style="display:flex;flex-wrap:wrap;margin:-4px">' +
    [10, 30, 50, 100, 200].map(function (v) {
      return '<button class="btn btn-ghost btn-sm" data-quick="' + v + '" style="margin:4px">+' + v + '</button>'
    }).join('') +
    '</div>' +
    '<button class="btn btn-primary btn-block mt-16" data-save-confirm>存入目标</button>',
    { title: '记一笔' }
  )
  if (!sheet) return

  const input = sheet.querySelector('#save-amount')
  sheet.querySelectorAll('[data-quick]').forEach(function (b) {
    b.addEventListener('click', function () {
      const cur = Number(input.value) || 0
      input.value = String(cur + Number(b.getAttribute('data-quick')))
    })
  })

  function submit() {
    const v = Number(input.value)
    if (!v || v <= 0) { toast('请输入大于 0 的金额'); return }
    const ach = addSaving(goalId, v)
    closeSheet()
    if (ach && ach.length) {
      setTimeout(function () { showCongrats(ach) }, 240)
    } else {
      toast('已存入 ¥' + fmtMoney(v))
    }
  }

  sheet.querySelector('[data-save-confirm]').addEventListener('click', submit)
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submit()
  })
  setTimeout(function () { input.focus() }, 120)
}