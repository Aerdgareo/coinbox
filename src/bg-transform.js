/**
 * 立绘 / 图片背景的平移与缩放
 *
 * 存储：settings.bgZoom（1~3 倍）、bgOffX / bgOffY（相对视口的百分比，作用在平移上）
 * 渲染：给 .bg-base 加 transform，百分比用 vw / vh，保证换屏不变形
 * 交互：点右下角「✥」进入调整模式（界面淡出），拖动平移、滚轮 / 双指缩放
 */
import { getState, updateSettings, getBgImage } from './state.js'
import { getTheme } from './themes.js'
import { toast } from './ui.js'

export const BG_ZOOM_MIN = 1
export const BG_ZOOM_MAX = 3

let active = false
let addedHideUI = false
let draft = { zoom: 1, x: 0, y: 0 }
let pointers = {}
let dragFrom = null
let pinchFrom = null

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v
}

function round2(v) {
  return Math.round(v * 100) / 100
}

function hasImageBg(s) {
  if (s.bgMode === 'image') return !!getBgImage()
  if (s.bgMode === 'theme') {
    const t = getTheme(s.theme)
    return !!(t && t.bgImage)
  }
  return false
}

function baseScale(s) {
  return s.bgFit === 'blur' ? 1.09 : 1
}

/** 把设置里的缩放与偏移刷到背景层上 */
export function applyBgTransform(s) {
  const bg = document.getElementById('bgBase')
  if (!bg) return
  const src = s || (getState() && getState().settings) || {}
  if (!hasImageBg(src)) {
    bg.style.transform = ''
    return
  }
  const z = clamp(Number(src.bgZoom) || 1, BG_ZOOM_MIN, BG_ZOOM_MAX)
  const x = Number(src.bgOffX) || 0
  const y = Number(src.bgOffY) || 0
  const b = baseScale(src)
  if (z <= 1.0001 && Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && b === 1) {
    bg.style.transform = ''
    return
  }
  bg.style.transform =
    'translate3d(' + round2(x) + 'vw,' + round2(y) + 'vh,0) scale(' + round2(z * b).toFixed(3) + ')'
}

/** 缩放后允许的平移范围：贴边为止，不会把背景拖出黑边 */
function maxOffset(zoom) {
  return Math.max(0, (zoom - 1) * 50)
}

function applyDraft() {
  const bg = document.getElementById('bgBase')
  if (!bg) return
  const s = getState().settings
  const b = baseScale(s)
  const z = draft.zoom
  const m = maxOffset(z)
  draft.x = clamp(draft.x, -m, m)
  draft.y = clamp(draft.y, -m, m)
  bg.style.transform =
    'translate3d(' + round2(draft.x) + 'vw,' + round2(draft.y) + 'vh,0) scale(' + round2(z * b).toFixed(3) + ')'
  syncControls()
}

function syncControls() {
  const rng = document.getElementById('bgZoomRange')
  const val = document.getElementById('bgZoomVal')
  if (rng) rng.value = String(Math.round(draft.zoom * 100))
  if (val) val.textContent = Math.round(draft.zoom * 100) + '%'
}

function commit() {
  updateSettings({ bgZoom: round2(draft.zoom), bgOffX: round2(draft.x), bgOffY: round2(draft.y) })
}

export function isAdjusting() {
  return active
}

export function enterBgAdjust() {
  const s = getState().settings
  if (!hasImageBg(s)) {
    toast('先在设置里选一张立绘或图片背景')
    return
  }
  if (active) return
  active = true
  draft = {
    zoom: clamp(Number(s.bgZoom) || 1, BG_ZOOM_MIN, BG_ZOOM_MAX),
    x: Number(s.bgOffX) || 0,
    y: Number(s.bgOffY) || 0
  }
  if (!document.body.classList.contains('hide-ui')) {
    document.body.classList.add('hide-ui')
    addedHideUI = true
  }
  document.body.classList.add('bg-adjust')
  const bar = document.getElementById('bgAdjustBar')
  if (bar) bar.hidden = false
  syncControls()
  applyDraft()
}

export function exitBgAdjust(save) {
  if (!active) return
  active = false
  pointers = {}
  dragFrom = null
  pinchFrom = null
  document.body.classList.remove('bg-adjust')
  if (addedHideUI) {
    document.body.classList.remove('hide-ui')
    addedHideUI = false
  }
  const bar = document.getElementById('bgAdjustBar')
  if (bar) bar.hidden = true
  if (save !== false) commit()
}

export function resetBgTransform() {
  draft = { zoom: 1, x: 0, y: 0 }
  applyDraft()
  if (!active) updateSettings({ bgZoom: 1, bgOffX: 0, bgOffY: 0 })
}

function pointerList() {
  const out = []
  for (const k in pointers) out.push(pointers[k])
  return out
}

function onDown(e) {
  if (!active) return
  if (e.target && e.target.closest && e.target.closest('#bgAdjustBar')) return
  pointers[e.pointerId] = { x: e.clientX, y: e.clientY }
  const list = pointerList()
  if (list.length === 1) {
    dragFrom = { px: e.clientX, py: e.clientY, x: draft.x, y: draft.y }
  } else if (list.length === 2) {
    const dx = list[0].x - list[1].x
    const dy = list[0].y - list[1].y
    pinchFrom = {
      dist: Math.sqrt(dx * dx + dy * dy) || 1,
      zoom: draft.zoom,
      x: draft.x,
      y: draft.y,
      mx: (list[0].x + list[1].x) / 2,
      my: (list[0].y + list[1].y) / 2
    }
    dragFrom = null
  }
  if (e.cancelable) e.preventDefault()
}

function onMove(e) {
  if (!active || !pointers[e.pointerId]) return
  pointers[e.pointerId] = { x: e.clientX, y: e.clientY }
  const list = pointerList()

  if (list.length >= 2 && pinchFrom) {
    const dx = list[0].x - list[1].x
    const dy = list[0].y - list[1].y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    draft.zoom = clamp(pinchFrom.zoom * (dist / pinchFrom.dist), BG_ZOOM_MIN, BG_ZOOM_MAX)
    draft.x = pinchFrom.x
    draft.y = pinchFrom.y
    applyDraft()
    if (e.cancelable) e.preventDefault()
    return
  }

  if (dragFrom) {
    draft.x = dragFrom.x + ((e.clientX - dragFrom.px) / window.innerWidth) * 100
    draft.y = dragFrom.y + ((e.clientY - dragFrom.py) / window.innerHeight) * 100
    applyDraft()
    if (e.cancelable) e.preventDefault()
  }
}

function onUp(e) {
  if (!active) return
  delete pointers[e.pointerId]
  const list = pointerList()
  if (list.length === 0) {
    dragFrom = null
    pinchFrom = null
    commit()
  } else if (list.length === 1) {
    pinchFrom = null
    dragFrom = { px: list[0].x, py: list[0].y, x: draft.x, y: draft.y }
  }
}

function onWheel(e) {
  if (!active) return
  e.preventDefault()
  const k = e.deltaY > 0 ? -1 : 1
  draft.zoom = clamp(draft.zoom * (1 + k * 0.08), BG_ZOOM_MIN, BG_ZOOM_MAX)
  applyDraft()
}

function onKey(e) {
  if (active && e.key === 'Escape') exitBgAdjust(true)
}

/** 一次性挂载全局监听；app 启动时调用 */
export function initBgAdjust() {
  const bar = document.getElementById('bgAdjustBar')
  if (!bar) return

  window.addEventListener('pointerdown', onDown, { passive: false })
  window.addEventListener('pointermove', onMove, { passive: false })
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  window.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('keydown', onKey)

  const rng = document.getElementById('bgZoomRange')
  if (rng) {
    rng.addEventListener('input', function () {
      draft.zoom = clamp(Number(rng.value) / 100, BG_ZOOM_MIN, BG_ZOOM_MAX)
      applyDraft()
    })
    rng.addEventListener('change', commit)
  }

  const reset = document.getElementById('bgAdjustReset')
  if (reset) reset.addEventListener('click', function () { resetBgTransform() })

  const done = document.getElementById('bgAdjustDone')
  if (done) done.addEventListener('click', function () { exitBgAdjust(true) })

  const edit = document.getElementById('bgEditBtn')
  if (edit) {
    edit.addEventListener('click', function () {
      if (active) exitBgAdjust(true)
      else enterBgAdjust()
    })
  }

  window.addEventListener('resize', function () {
    if (!active) applyBgTransform()
  })
}
