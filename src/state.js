import { generateTiers, rollTier, clamp } from './draw.js'

const STORE_KEY = 'coinbox.state.v2'
const IMG_KEY = 'coinbox.bgimage.v1'

export const BG_FITS = ['cover', 'contain', 'tile', 'stretch', 'blur']

const listeners = []
let state = null
let memoryFallback = {}

function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    return memoryFallback[key] || null
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, val)
  } catch (e) {
    memoryFallback[key] = val
  }
}

export function todayStr(d) {
  const t = d || new Date()
  const m = t.getMonth() + 1
  const day = t.getDate()
  return t.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day)
}

export function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function money(n) {
  const v = Math.round(n * 100) / 100
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

function normalizeChildren(list) {
  const out = []
  const arr = Array.isArray(list) ? list : []
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i] || {}
    const item = {
      id: c.id || uid('c'),
      name: String(c.name || '子目标').slice(0, 24),
      target: Math.max(1, Number(c.target) || 1),
      saved: Math.max(0, Number(c.saved) || 0),
      priority: clamp(Number(c.priority) || i + 1, 1, 99),
      doneAt: null
    }
    if (item.saved >= item.target) item.doneAt = c.doneAt || Date.now()
    out.push(item)
  }
  return out
}

function defaultGoal() {
  return {
    id: 'g_default',
    name: '我的第一台电脑',
    emoji: '💻',
    target: 6999,
    saved: 0,
    ownSaved: 0,
    children: [],
    createdAt: Date.now(),
    doneAt: null
  }
}

function defaultState() {
  return {
    v: 2,
    activeGoal: 'g_default',
    goals: [defaultGoal()],
    settings: {
      theme: 'default',
      accent: '#7b6cff',
      bgTint: '#0b0d18',
      bgMode: 'theme',
      bgFit: 'cover',
      bgColor: '#0b0d18',
      bgGradient: ['#0b0d18', '#232a52'],
      photoTint: 'auto',
      photoAccent: '#e8b45c',
      particles: true,
      dailyDraws: 1,
      drawMin: 1,
      drawMax: 100,
      sound: true,
      reduceMotion: false
    },
    draw: {
      date: '',
      used: 0,
      tiers: null
    },
    history: []
  }
}

function migrate(raw) {
  const base = defaultState()
  if (!raw || typeof raw !== 'object') return base

  const s = Object.assign(base, raw)
  s.settings = Object.assign(base.settings, raw.settings || {})
  if (!Array.isArray(s.goals) || s.goals.length === 0) s.goals = base.goals
  if (!Array.isArray(s.history)) s.history = []
  for (let i = 0; i < s.goals.length; i++) {
    const g = s.goals[i]
    g.target = Number(g.target) || 1
    g.saved = Number(g.saved) || 0
    if (!g.emoji) g.emoji = '🎯'
    if (!Array.isArray(g.children)) g.children = []
    for (let j = 0; j < g.children.length; j++) {
      const c = g.children[j]
      c.id = c.id || uid('c')
      c.name = String(c.name || '子目标').slice(0, 24)
      c.target = Math.max(1, Number(c.target) || 1)
      c.saved = Math.max(0, Number(c.saved) || 0)
      c.priority = clamp(Number(c.priority) || j + 1, 1, 99)
      if (c.saved >= c.target && !c.doneAt) c.doneAt = Date.now()
    }
    const childSum = g.children.reduce(function (a, c) {
      return a + c.saved
    }, 0)
    if (g.ownSaved == null) g.ownSaved = Math.max(0, g.saved - childSum)
    g.saved = Math.round((childSum + g.ownSaved) * 100) / 100
  }
  s.settings.dailyDraws = clamp(Number(s.settings.dailyDraws) || 1, 1, 3)
  s.settings.drawMin = clamp(Number(s.settings.drawMin) || 1, 0.1, 500)
  s.settings.drawMax = clamp(Number(s.settings.drawMax) || 100, s.settings.drawMin, 5000)
  if (!s.settings.photoTint) s.settings.photoTint = 'auto'
  if (!s.settings.photoAccent) s.settings.photoAccent = '#e8b45c'
  if (BG_FITS.indexOf(s.settings.bgFit) === -1) s.settings.bgFit = 'cover'
  return s
}

export function getState() {
  return state
}

export function init() {
  let raw = null
  try {
    raw = JSON.parse(safeGet(STORE_KEY) || 'null')
  } catch (e) {
    raw = null
  }
  state = migrate(raw)

  const active = state.goals.filter(function (g) {
    return g.id === state.activeGoal
  })[0]
  if (!active) state.activeGoal = state.goals[0].id

  refreshDaily(true)
  save(false)
  return state
}

export function subscribe(fn) {
  listeners.push(fn)
  return function () {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export function notify() {
  for (let i = 0; i < listeners.length; i++) {
    try {
      listeners[i](state)
    } catch (e) {
      console.error(e)
    }
  }
}

export function save(emit) {
  safeSet(STORE_KEY, JSON.stringify(state))
  if (emit !== false) notify()
}

export function activeGoal() {
  for (let i = 0; i < state.goals.length; i++) {
    if (state.goals[i].id === state.activeGoal) return state.goals[i]
  }
  return state.goals[0]
}

/**
 * 跨日刷新：重置次数并重新生成当日档位
 */
/**
 * 把金额按子目标优先级分配：先填优先级高的子目标，溢出继续下一个，剩余进大目标。
 */
export function applyToGoal(goal, amount) {
  let left = Math.round(Number(amount) * 100) / 100
  const achievements = []
  if (!(left > 0)) return { addedToChild: 0, addedToGoal: 0, achievements: achievements }

  const kids = (goal.children || []).slice().sort(function (a, b) {
    return (a.priority || 99) - (b.priority || 99)
  })
  let addedToChild = 0
  for (let i = 0; i < kids.length; i++) {
    if (left <= 0) break
    const c = kids[i]
    const need = Math.max(0, c.target - c.saved)
    if (need <= 0) continue
    const add = Math.min(need, left)
    c.saved = Math.round((c.saved + add) * 100) / 100
    left = Math.round((left - add) * 100) / 100
    addedToChild = addedToChild + add
    if (c.saved >= c.target && !c.doneAt) {
      c.doneAt = Date.now()
      achievements.push({ type: 'child', name: c.name })
    }
  }

  goal.ownSaved = Math.round(((goal.ownSaved || 0) + left) * 100) / 100
  let childSum = 0
  for (let i = 0; i < (goal.children || []).length; i++) childSum += goal.children[i].saved
  goal.saved = Math.round((childSum + goal.ownSaved) * 100) / 100
  if (goal.saved >= goal.target && !goal.doneAt) {
    goal.doneAt = Date.now()
    achievements.push({ type: 'goal', name: goal.name })
  }

  return { addedToChild: addedToChild, addedToGoal: left, achievements: achievements }
}

export function refreshDaily(force) {
  const today = todayStr()
  const goal = activeGoal()
  if (force || !state.draw.tiers || state.draw.date !== today || !state.draw.tiers.t1) {
    if (state.draw.date !== today) state.draw.used = 0
    state.draw.date = today
    state.draw.tiers = generateTiers(goal, today, state.settings)
  }
}

export function rebuildTiers() {
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
}

export function drawRemaining() {
  refreshDaily()
  return clamp(state.settings.dailyDraws - state.draw.used, 0, 3)
}

export function performDraw() {
  refreshDaily()
  if (drawRemaining() <= 0) {
    return { ok: false, reason: 'limit' }
  }

  const tiers = state.draw.tiers
  const kind = rollTier(tiers)
  const goal = activeGoal()
  const amount = kind === 'miss' ? 0 : tiers[kind].amount
  let achievements = []

  if (amount > 0) {
    achievements = applyToGoal(goal, amount).achievements
  }

  state.draw.used += 1
  state.history.unshift({
    id: uid('h'),
    ts: Date.now(),
    goalId: goal.id,
    goalName: goal.name,
    kind: kind,
    amount: amount
  })
  if (state.history.length > 300) state.history.length = 300

  save()
  return {
    ok: true,
    kind: kind,
    amount: amount,
    goal: goal,
    achievements: achievements,
    remaining: drawRemaining()
  }
}

export function addSaving(goalId, amount) {
  const g = findGoal(goalId)
  if (!g) return false
  const v = Math.max(0, Number(amount) || 0)
  if (!v) return false
  const r = applyToGoal(g, v)
  save()
  return r.achievements
}

export function findGoal(id) {
  for (let i = 0; i < state.goals.length; i++) {
    if (state.goals[i].id === id) return state.goals[i]
  }
  return null
}

export function setActiveGoal(id) {
  if (!findGoal(id)) return
  state.activeGoal = id
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
}

export function createGoal(data) {
  const children = normalizeChildren(data.children)
  let childSum = 0
  for (let i = 0; i < children.length; i++) childSum += children[i].saved
  const initial = Math.max(0, Number(data.saved) || 0)
  const g = {
    id: uid('g'),
    name: String(data.name || '新目标').slice(0, 24),
    emoji: data.emoji || '🎯',
    target: Math.max(1, Number(data.target) || 1000),
    saved: initial,
    ownSaved: Math.max(0, initial - childSum),
    children: children,
    createdAt: Date.now(),
    doneAt: null
  }
  if (g.saved >= g.target) g.doneAt = Date.now()
  state.goals.push(g)
  state.activeGoal = g.id
  state.draw.tiers = generateTiers(g, state.draw.date || todayStr(), state.settings)
  save()
  return g
}

export function updateGoal(id, data) {
  const g = findGoal(id)
  if (!g) return false
  if (typeof data.name === 'string') g.name = data.name.slice(0, 24) || g.name
  if (data.emoji) g.emoji = data.emoji
  if (data.target != null) g.target = Math.max(1, Number(data.target) || 1)
  if (Array.isArray(data.children)) g.children = normalizeChildren(data.children)

  let childSum = 0
  for (let i = 0; i < (g.children || []).length; i++) childSum += g.children[i].saved

  if (data.saved != null) {
    const v = Math.max(0, Number(data.saved) || 0)
    g.ownSaved = Math.max(0, v - childSum)
  }
  if (g.ownSaved == null) g.ownSaved = 0
  g.saved = Math.round((childSum + g.ownSaved) * 100) / 100
  g.doneAt = g.saved >= g.target ? g.doneAt || Date.now() : null
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
  return true
}

export function deleteGoal(id) {
  if (state.goals.length <= 1) return false
  state.goals = state.goals.filter(function (g) {
    return g.id !== id
  })
  if (state.activeGoal === id) state.activeGoal = state.goals[0].id
  state.history = state.history.filter(function (h) {
    return h.goalId !== id
  })
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
  return true
}

export function updateSettings(patch) {
  const keys = Object.keys(patch)
  for (let i = 0; i < keys.length; i++) {
    state.settings[keys[i]] = patch[keys[i]]
  }
  if (patch.dailyDraws != null) {
    state.settings.dailyDraws = clamp(Number(patch.dailyDraws) || 1, 1, 3)
  }
  if (patch.drawMin != null) {
    state.settings.drawMin = clamp(Number(patch.drawMin) || 1, 0.1, 500)
  }
  if (patch.drawMax != null) {
    state.settings.drawMax = clamp(Number(patch.drawMax) || 100, state.settings.drawMin, 5000)
  }
  if (patch.drawMin != null || patch.drawMax != null) {
    if (state.settings.drawMax < state.settings.drawMin) {
      state.settings.drawMax = state.settings.drawMin
    }
    state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  }
  save()
}

const CHAR_KEY = 'coinbox.character.'

export function getCharImage(themeId) {
  return safeGet(CHAR_KEY + themeId)
}

export function setCharImage(themeId, dataUrl) {
  if (!dataUrl) {
    try {
      localStorage.removeItem(CHAR_KEY + themeId)
    } catch (e) {}
    memoryFallback[CHAR_KEY + themeId] = null
    return
  }
  safeSet(CHAR_KEY + themeId, dataUrl)
}

export function getBgImage() {
  return safeGet(IMG_KEY)
}

export function setBgImage(dataUrl) {
  if (!dataUrl) {
    try {
      localStorage.removeItem(IMG_KEY)
    } catch (e) {}
    memoryFallback[IMG_KEY] = null
    return
  }
  safeSet(IMG_KEY, dataUrl)
}

export function exportData() {
  const data = JSON.parse(JSON.stringify(state))
  data.bgImage = getBgImage() || ''
  return JSON.stringify(data, null, 2)
}

export function importData(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    return false
  }
  if (!obj || !Array.isArray(obj.goals) || obj.goals.length === 0) return false
  const bg = obj.bgImage || ''
  delete obj.bgImage
  state = migrate(obj)
  if (!findGoal(state.activeGoal)) state.activeGoal = state.goals[0].id
  refreshDaily(true)
  setBgImage(bg)
  save()
  return true
}

export function resetAll() {
  state = defaultState()
  refreshDaily(true)
  setBgImage('')
  save()
}