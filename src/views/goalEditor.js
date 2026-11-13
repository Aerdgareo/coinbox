import { getState, createGoal, updateGoal, deleteGoal, findGoal } from '../state.js'
import { fmtMoney, escapeHtml, openSheet, closeSheet, toast, confirmDialog } from '../ui.js'

const EMOJIS = ['💻', '📱', '🎧', '🎮', '⌨️', '🖥️', '📷', '🎨', '🎸', '🛹', '🚲', '✈️', '🎁', '🎯', '☕', '🐱']

export function openGoalEditor(goalId) {
  const isEdit = !!goalId && !!findGoal(goalId)
  const g = isEdit ? findGoal(goalId) : { name: '', emoji: '🎯', target: 1000, saved: 0, children: [] }

  let children = (g.children || []).map(function (c, i) {
    return {
      id: c.id,
      name: c.name,
      target: c.target,
      saved: c.saved || 0,
      priority: c.priority || i + 1
    }
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
    '<input class="input" id="g-target" type="number" inputmode="decimal" min="1" step="1" value="' + g.target + '"></div>' +
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

  function renderChildren() {
    const box = sheet.querySelector('#child-list')
    if (!children.length) {
      box.innerHTML = '<div class="faint tiny" style="padding:6px 2px">还没有子目标，可以在大目标下拆出配件</div>'
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
        '<input class="input" data-cpriority type="number" min="1" max="99" value="' + (c.priority || i + 1) + '"></div>' +
        '<button class="child-del" data-cdel>✕</button>' +
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
      })
      row.querySelector('[data-cpriority]').addEventListener('input', function (e) {
        children[idx].priority = Math.max(1, Number(e.target.value) || 1)
      })
      row.querySelector('[data-cdel]').addEventListener('click', function () {
        children.splice(idx, 1)
        renderChildren()
      })
    })
  }
  renderChildren()

  sheet.querySelector('#child-add').addEventListener('click', function () {
    children.push({ name: '', target: 100, saved: 0, priority: children.length + 1 })
    renderChildren()
  })

  sheet.querySelector('#g-submit').addEventListener('click', function () {
    const name = sheet.querySelector('#g-name').value.trim()
    const target = Number(sheet.querySelector('#g-target').value)
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