import { init, subscribe, getState, updateSettings, refreshDaily, notify, todayStr, initUserBgs } from './state.js'
import { applyAppearance } from './appearance.js'
import { initParticles } from './particles.js'
import { initEffects } from './effects.js'
import { renderHome } from './views/home.js'
import { renderHistory } from './views/history.js'
import { renderSettings } from './views/settings.js'
import { openBgFitSheet } from './views/bgfit.js'
import { initBgAdjust } from './bg-transform.js'
import { toast } from './ui.js'

const ICONS = {
  home:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3.5 10.4 12 3.5l8.5 6.9"/><path d="M5.5 9.4V20h13V9.4"/><path d="M9.8 20v-5.4h4.4V20"/></svg>',
  history:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.4V12l3.2 1.9"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 7h9"/><path d="M18 7h2"/><path d="M4 17h2"/><path d="M11 17h9"/>' +
    '<circle cx="15.5" cy="7" r="2.2"/><circle cx="8.5" cy="17" r="2.2"/></svg>'
}

const TABS = [
  { id: 'home', name: '攒钱', icon: ICONS.home },
  { id: 'history', name: '记录', icon: ICONS.history },
  { id: 'settings', name: '设置', icon: ICONS.settings }
]

const ROUTES = {
  home: renderHome,
  history: renderHistory,
  settings: renderSettings
}

let route = 'home'
let started = false

function renderTopbar() {
  const el = document.getElementById('topbar')
  el.innerHTML =
    '<div class="brand">' +
    '<div class="brand-mark">🎁</div>' +
    '<div class="brand-text">' +
    '<div class="brand-title">攒钱盲盒</div>' +
    '<div class="brand-sub">每天开一次 · 离想要的东西更近一点</div>' +
    '</div></div>'
}

function renderTabs() {
  const el = document.getElementById('tabbar')
  let html = ''
  for (let i = 0; i < TABS.length; i++) {
    const t = TABS[i]
    html +=
      '<button class="tab' + (route === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' +
      '<span class="ti">' + t.icon + '</span>' +
      '<span class="tl">' + t.name + '</span></button>'
  }
  el.innerHTML = html
  el.querySelectorAll('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      go(b.getAttribute('data-tab'))
    })
  })
}

function renderView() {
  const el = document.getElementById('view')
  const fn = ROUTES[route] || renderHome
  fn(el)
}

function go(id) {
  if (route === id) return
  route = id
  renderView()
  renderTabs()
  window.scrollTo(0, 0)
}

async function boot() {
  const canvas = document.getElementById('particles')
  initParticles(canvas)
  initEffects(document.getElementById('fx'))

  // 背景图存在 IndexedDB 里：先预热成内存 objectURL，再渲染，避免首屏闪一下渐变
  try {
    await initUserBgs()
  } catch (e) {
    console.error('背景库读取失败', e)
  }

  const state = init()
  applyAppearance(state)

  renderTopbar()
  renderTabs()
  renderView()

  const hideBtn = document.getElementById('hideUiBtn')
  if (hideBtn) {
    hideBtn.addEventListener('click', function () {
      const on = document.body.classList.toggle('hide-ui')
      toast(on ? '界面已隐藏，右下角可切换黑夜 / 原图' : '界面已恢复')
    })
  }

  const nightBtn = document.getElementById('nightBtn')
  if (nightBtn) {
    nightBtn.addEventListener('click', function () {
      const dim = !(getState().settings.hideDim !== false)
      updateSettings({ hideDim: dim })
      toast(dim ? '黑夜模式：已压暗' : '原图模式：按原色显示')
    })
  }

  const fitBtn = document.getElementById('bgFitBtn')
  if (fitBtn) {
    fitBtn.addEventListener('click', function () {
      openBgFitSheet()
    })
  }

  initBgAdjust()

  subscribe(function (s) {
    applyAppearance(s)
    renderView()
    renderTabs()
  })

  let lastDay = todayStr()
  setInterval(function () {
    const d = todayStr()
    if (d !== lastDay) {
      lastDay = d
      refreshDaily()
      notify()
      toast('新的一天，盲盒刷新啦')
    }
  }, 30000)

  window.addEventListener('hashchange', syncHash)
  syncHash()
  started = true
}

function syncHash() {
  const h = (location.hash || '').replace('#', '')
  if (h && ROUTES[h]) {
    route = h
    renderView()
    renderTabs()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}

export { started }