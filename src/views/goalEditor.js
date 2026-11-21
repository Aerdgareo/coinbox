import {
  getState,
  createGoal,
  updateGoal,
  deleteGoal,
  findGoal,
  childTargetSum,
  updateChild,
  deleteChild
} from '../state.js'
import { fmtMoney, escapeHtml, openSheet, closeSheet, toast, confirmDialog } from '../ui.js'

const EMOJIS = ['💻', '📱', '🎧', '🎮', '⌨️', '🖥️', '📷', '🎨', '🎸', '🛹', '🚲', '✈️', '🎁', '🎯', '☕', '🐱']

export function openGoalEditor(goalId) {
  const isEdit = !!goalId && !!findGoal(goalId)
  const g = isEdit ? findGoal(goalId) : { name: '', emoji: '🎯', target: 1000, saved: 0, children: [] }

  let children = (g.children || [])
    .map(function (c, i) {
      return {
        id: c.id,
        name: c.name,
        target: c.target,
        saved: c.saved || 0,
        priority: c.priority || i + 1
      }
    })
    .sort(function (a, b) {
      return a.priority - b.priority
    })

  const html =
    '<div class="field"><div class="label">目标名称</div>' +
    '<input class="input" id="g-name" maxlength="24" placeholder="比如：新电脑" value="' + escapeHtml(g.name) + '"></div>' +
    '<div class="field"><div class="label">图标</div><div class="swatches" id="emoji-list">' +
    EMOJIS.map(function (e) {
      return '<button class="swatch" data-emoji="' + e + '" style="background:rgba(255,255,255,.06);font-size:17px;line-height:1">' + e + '</button>'
    }).join('') +
    '</div></div>' +
    '<div class="field"><div class="label">目标金额（元）</div>' +
    '<input class="input" id="g-target" type="number" inputmode="decimal" min="1" step="1" value="' + g.target + '">' +
    '<div class="faint tiny mt-8" id="g-target-note" style="line-height:1.6"></div></div>' +
    (isEdit
      ? '<div class="field"><div class="label">已存金额（元）</div>' +
        '<input class="input" id="g-saved" type="number" inputmode="decimal" min="0" step="0.01" value="' + g.saved + '"></div>'
      : '') +
    '<div class="field"><div class="label">子目标（按优先级分钱，数字越小越先填）</div>' +
    '<div id="child-list"></div>' +
    '<button class="btn btn-ghost btn-sm" id="child-add" style="width:100%;margin-top:6px">＋ 添加子目标</button></div>' +
    '<button class="btn btn-primary btn-block mt-16" id="g-submit">' + (isEdit ? '保存修改' : '创建目标') + '</button>' +
    (isEdit
      ? '<button class="btn btn-ghost btn-block mt-12" id="g-delete" style="color:var(--bad)">删除这个目标</button>'
      : '')

  const sheet = openSheet(html, { title: isEdit ? '编辑目标' : '新目标' })
  if (!sheet) return

  let emoji = g.emoji
  const list = sheet.querySelector('#emoji-list')
  const buttons = list.querySelectorAll('[data-emoji]')
  function paint() {
    buttons.forEach(function (b) {
      const on = b.getAttribute('data-emoji') === emoji
      b.style.borderColor = on ? 'var(--accent)' : 'transparent'
      b.style.boxShadow = on ? '0 0 0 2px var(--accent-soft)' : 'none'
    })
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      emoji = b.getAttribute('data-emoji')
      paint()
    })
  })
  paint()

  const targetInput = sheet.querySelector('#g-target')
  const targetNote = sheet.querySelector('#g-target-note')

  // 有子目标时，大目标金额恒等于子目标金额之和，只读展示
  function syncTargetInput() {
    const hasKids = children.length > 0
    if (hasKids) {
      const sum = childTargetSum(children)
      targetInput.value = String(sum)
      targetInput.readOnly = true
      targetInput.style.opacity = '0.66'
      targetNote.textContent = '已按子目标合计：¥' + fmtMoney(sum) + ' = 各子目标金额之和'
    } else {
      targetInput.readOnly = false
      targetInput.style.opacity = ''
      targetNote.textContent = '添加子目标后，这里会自动变成子目标金额之和。'
    }
  }

  function renderChildren() {
    const box = sheet.querySelector('#child-list')
    if (!children.length) {
      box.innerHTML = '<div class="faint tiny" style="padding:6px 2px">还没有子目标，可以在大目标下拆出配件</div>'
      syncTargetInput()
      return
    }
    let html = ''
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      html +=
        '<div class="child-edit-item" data-idx="' + i + '">' +
        '<div class="child-edit-row">' +
        '<div class="child-col child-col-name"><div class="label">名称</div>' +
        '<input class="input" data-cname value="' + escapeHtml(c.name) + '" placeholder="例如 内存条"></div>' +
        '<div class="child-col child-col-target"><div class="label">金额</div>' +
        '<input class="input" data-ctarget type="number" min="1" step="1" value="' + c.target + '"></div>' +
        '<div class="child-col child-col-priority"><div class="label">优先级</div>' +
        '<div class="prio-stepper">' +
        '<button class="prio-btn" data-cup' + (i === 0 ? ' disabled' : '') + ' aria-label="提高优先级">▲</button>' +
        '<span class="prio-val">P' + (c.priority || i + 1) + '</span>' +
        '<button class="prio-btn" data-cdown' + (i === children.length - 1 ? ' disabled' : '') + ' aria-label="降低优先级">▼</button>' +
        '</div></div>' +
        '<button class="child-del" data-cdel aria-label="删除子目标">✕</button>' +
        '</div></div>'
    }
    box.innerHTML = html

    box.querySelectorAll('[data-idx]').forEach(function (row) {
      const idx = Number(row.getAttribute('data-idx'))
      row.querySelector('[data-cname]').addEventListener('input', function (e) {
        children[idx].name = e.target.value
      })
      row.querySelector('[data-ctarget]').addEventListener('input', function (e) {
        children[idx].target = Math.max(1, Number(e.target.value) || 1)
        syncTargetInput()
      })
      const up = row.querySelector('[data-cup]')
      if (up) {
        up.addEventListener('click', function () {
          moveChild(idx, -1)
        })
      }
      const down = row.querySelector('[data-cdown]')
      if (down) {
        down.addEventListener('click', function () {
          moveChild(idx, 1)
        })
      }
      row.querySelector('[data-cdel]').addEventListener('click', function () {
        children.splice(idx, 1)
        spreadPriority()
        renderChildren()
      })
    })
    syncTargetInput()
  }

  /** 上下键交换：整行与邻居换位，优先级重新编号成 1..n */
  function moveChild(idx, dir) {
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= children.length) return
    const next = children.slice()
    const item = next.splice(idx, 1)[0]
    next.splice(j, 0, item)
    children = next
    spreadPriority()
    renderChildren()
  }

  function spreadPriority() {
    for (let i = 0; i < children.length; i++) children[i].priority = i + 1
  }

  renderChildren()

  sheet.querySelector('#child-add').addEventListener('click', function () {
    children.push({ name: '', target: 100, saved: 0, priority: children.length + 1 })
    renderChildren()
  })

  sheet.querySelector('#g-submit').addEventListener('click', function () {
    const name = sheet.querySelector('#g-name').value.trim()
    const target = children.length ? childTargetSum(children) : Number(sheet.querySelector('#g-target').value)
    if (!name) { toast('给目标起个名字吧'); return }
    if (!target || target <= 0) { toast('目标金额要大于 0'); return }

    const clean = []
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      const cn = String(c.name || '').trim()
      if (!cn) continue
      clean.push({
        id: c.id,
        name: cn.slice(0, 24),
        target: Math.max(1, Number(c.target) || 1),
        saved: c.saved || 0,
        priority: Math.max(1, Number(c.priority) || i + 1)
      })
    }

    if (isEdit) {
      const savedEl = sheet.querySelector('#g-saved')
      updateGoal(goalId, {
        name: name,
        emoji: emoji,
        target: target,
        saved: savedEl ? Number(savedEl.value) : undefined,
        children: clean
      })
      toast('已保存')
    } else {
      createGoal({ name: name, emoji: emoji, target: target, children: clean })
      toast('目标创建好啦')
    }
    closeSheet()
  })

  const del = sheet.querySelector('#g-delete')
  if (del) {
    del.addEventListener('click', function () {
      closeSheet()
      setTimeout(function () {
        confirmDialog('删除目标', '删除后，这个目标下的抽奖记录也会一起消失，确定吗？', true).then(function (ok) {
          if (!ok) return
          if (deleteGoal(goalId)) toast('已删除')
          else toast('至少要保留一个目标')
        })
      }, 220)
    })
  }
}

export function openGoalDetail(goalId) {
  openGoalEditor(goalId)
}

/** 首页点某个子目标：直接改这一条，不用进整份目标编辑 */
export function openChildEditor(goalId, childId) {
  const g = findGoal(goalId)
  if (!g) return
  const kids = (g.children || []).slice().sort(function (a, b) {
    return (a.priority || 99) - (b.priority || 99)
  })
  let idx = -1
  for (let i = 0; i < kids.length; i++) if (kids[i].id === childId) idx = i
  if (idx < 0) return
  const c = kids[idx]
  const pct = c.target > 0 ? Math.min(100, (c.saved / c.target) * 100) : 0

  const html =
    '<div class="field"><div class="label">子目标名称</div>' +
    '<input class="input" id="c-name" maxlength="24" value="' + escapeHtml(c.name) + '"></div>' +
    '<div class="flex">' +
    '<div class="grow" style="margin-right:10px"><div class="label">目标金额（元）</div>' +
    '<input class="input" id="c-target" type="number" inputmode="decimal" min="1" step="1" value="' + c.target + '"></div>' +
    '<div class="grow"><div class="label">已存（元）</div>' +
    '<input class="input" id="c-saved" type="number" inputmode="decimal" min="0" step="0.01" value="' + (c.saved || 0) + '"></div>' +
    '</div>' +
    '<div class="row mt-12"><div class="row-main"><div class="row-text">' +
    '<div class="row-title">优先级</div>' +
    '<div class="row-sub">数字越小越先分到钱</div></div></div>' +
    '<div class="prio-stepper" style="width:92px">' +
    '<button class="prio-btn" id="c-pup" aria-label="提高优先级">▲</button>' +
    '<span class="prio-val" id="c-prio">P' + (idx + 1) + '</span>' +
    '<button class="prio-btn" id="c-pdown" aria-label="降低优先级">▼</button>' +
    '</div></div>' +
    '<div class="faint tiny mt-8">在「' + escapeHtml(g.name) + '」里占 ' + pct.toFixed(0) + '%，' +
    '已完成 ¥' + fmtMoney(c.saved) + ' / ¥' + fmtMoney(c.target) + '</div>' +
    '<button class="btn btn-primary btn-block mt-16" id="c-save">保存</button>' +
    '<button class="btn btn-ghost btn-block mt-12" id="c-del" style="color:var(--bad)">删除这个子目标</button>'

  const sheet = openSheet(html, { title: '编辑子目标' })
  if (!sheet) return

  const nameEl = sheet.querySelector('#c-name')
  const targetEl = sheet.querySelector('#c-target')
  const savedEl = sheet.querySelector('#c-saved')
  const prioEl = sheet.querySelector('#c-prio')

  function refreshPrio() {
    const now = findGoal(goalId)
    if (!now) return
    const list = (now.children || []).slice().sort(function (a, b) {
      return (a.priority || 99) - (b.priority || 99)
    })
    for (let i = 0; i < list.length; i++) if (list[i].id === childId) prioEl.textContent = 'P' + (i + 1)
  }

  function move(dir) {
    const now = findGoal(goalId)
    if (!now) return
    const list = (now.children || []).slice().sort(function (a, b) {
      return (a.priority || 99) - (b.priority || 99)
    })
    let i = -1
    for (let k = 0; k < list.length; k++) if (list[k].id === childId) i = k
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    const tmp = list[i]
    list[i] = list[j]
    list[j] = tmp
    for (let k = 0; k < list.length; k++) list[k].priority = k + 1
    updateGoal(goalId, { children: list })
    refreshPrio()
  }

  sheet.querySelector('#c-pup').addEventListener('click', function () { move(-1) })
  sheet.querySelector('#c-pdown').addEventListener('click', function () { move(1) })

  sheet.querySelector('#c-save').addEventListener('click', function () {
    const name = nameEl.value.trim()
    if (!name) { toast('子目标要有名字'); return }
    const target = Number(targetEl.value)
    if (!target || target <= 0) { toast('金额要大于 0'); return }
    updateChild(goalId, childId, {
      name: name,
      target: target,
      saved: Number(savedEl.value) || 0
    })
    closeSheet()
    toast('子目标已更新')
  })

  sheet.querySelector('#c-del').addEventListener('click', function () {
    closeSheet()
    setTimeout(function () {
      confirmDialog('删除子目标', '删掉后，已存进这个子目标的钱会退回大目标，不会消失。确定吗？', true).then(function (ok) {
        if (!ok) return
        if (deleteChild(goalId, childId)) toast('已删除，钱已退回大目标')
      })
    }, 220)
  })
}