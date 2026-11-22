import { generateTiers, rollTier, clamp } from './draw.js'
import * as bgStore from './bg-store.js'

const STORE_KEY = 'coinbox.state.v2'
const IMG_KEY = 'coinbox.bgimage.v1'
const USERBG_KEY = 'coinbox.userbgs.v1'

export const BG_FITS = ['cover', 'contain', 'tile', 'stretch', 'blur']
export const BG_EFFECTS = ['none', 'snow', 'stars', 'notes', 'sakura']

/** 压暗默认值：圆心在 50% / 20%（人物头部），范围与强度都是 100% */
export const DIM_DEFAULTS = { dimX: 50, dimY: 20, dimSpread: 100, dimStrength: 100 }

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

/** 子目标金额合计 */
export function childTargetSum(children) {
  const arr = Array.isArray(children) ? children : []
  let sum = 0
  for (let i = 0; i < arr.length; i++) sum += Math.max(1, Number(arr[i].target) || 1)
  return Math.round(sum * 100) / 100
}

/**
 * 不变式：只要有子目标，大目标金额 = 子目标金额之和。
 * 避免出现「目标 ¥6999 / 子目标合计 ¥6500」这种对不上的情况。
 */
export function syncGoalTarget(g) {
  if (!g || !Array.isArray(g.children) || !g.children.length) return g
  g.target = childTargetSum(g.children)
  return g
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
      effect: 'stars',
      hideDim: true,
      dimX: 50,
      dimY: 20,
      dimSpread: 100,
      dimStrength: 100,
      dimPresets: {},
      userBgId: '',
      bgZoom: 1,
      bgOffX: 0,
      bgOffY: 0,
      dailyDraws: 1,
      drawQuota: 'shared',
      drawMin: 1,
      drawMax: 100,
      sound: true,
      reduceMotion: false
    },
    draw: {
      date: '',
      used: 0,
      usedByGoal: {},
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
    syncGoalTarget(g)
    g.doneAt = g.saved >= g.target ? g.doneAt || Date.now() : null
  }
  s.settings.dailyDraws = clamp(Number(s.settings.dailyDraws) || 1, 1, 3)
  s.settings.drawMin = clamp(Number(s.settings.drawMin) || 1, 0.1, 500)
  s.settings.drawMax = clamp(Number(s.settings.drawMax) || 100, s.settings.drawMin, 5000)
  if (!s.settings.photoTint) s.settings.photoTint = 'auto'
  if (!s.settings.photoAccent) s.settings.photoAccent = '#e8b45c'
  if (BG_FITS.indexOf(s.settings.bgFit) === -1) s.settings.bgFit = 'cover'
  if (BG_EFFECTS.indexOf(s.settings.effect) === -1) s.settings.effect = 'stars'
  s.settings.hideDim = s.settings.hideDim !== false

  // 压暗中心 / 范围 / 强度（老存档没有这些字段，用默认值补齐）
  s.settings.dimX = clamp(numOr(s.settings.dimX, 50), 0, 100)
  s.settings.dimY = clamp(numOr(s.settings.dimY, 20), 0, 100)
  s.settings.dimSpread = clamp(numOr(s.settings.dimSpread, 100), 60, 200)
  s.settings.dimStrength = clamp(numOr(s.settings.dimStrength, 100), 20, 180)
  s.settings.bgZoom = clamp(numOr(s.settings.bgZoom, 1), 1, 3)
  s.settings.bgOffX = clamp(numOr(s.settings.bgOffX, 0), -80, 80)
  s.settings.bgOffY = clamp(numOr(s.settings.bgOffY, 0), -80, 80)

  // 每张背景一套压暗参数：{ 'theme:photo-miku-01': {x,y,spread,strength}, 'user:ub_xxx': {...} }
  if (!s.settings.dimPresets || typeof s.settings.dimPresets !== 'object' || Array.isArray(s.settings.dimPresets)) {
    s.settings.dimPresets = {}
  }
  const presets = s.settings.dimPresets
  const pkeys = Object.keys(presets)
  for (let i = 0; i < pkeys.length; i++) {
    const p = presets[pkeys[i]]
    if (!p || typeof p !== 'object') {
      delete presets[pkeys[i]]
      continue
    }
    presets[pkeys[i]] = {
      x: clamp(numOr(p.x, 50), 0, 100),
      y: clamp(numOr(p.y, 20), 0, 100),
      spread: clamp(numOr(p.spread, 100), 60, 200),
      strength: clamp(numOr(p.strength, 100), 20, 180)
    }
  }

  // 用户自添背景：选中的那张可能已被删除
  const own = loadUserBgs()
  if (!own.some(function (b) { return b.id === s.settings.userBgId })) {
    s.settings.userBgId = own.length ? own[0].id : ''
  }

  if (s.settings.drawQuota !== 'perGoal') s.settings.drawQuota = 'shared'
  if (!s.draw || typeof s.draw !== 'object') s.draw = { date: '', used: 0, usedByGoal: {}, tiers: null }
  if (!s.draw.usedByGoal || typeof s.draw.usedByGoal !== 'object') s.draw.usedByGoal = {}
  return s
}

function numOr(v, d) {
  const n = Number(v)
  return isFinite(n) ? n : d
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
    if (state.draw.date !== today) {
      state.draw.used = 0
      state.draw.usedByGoal = {}
    }
    state.draw.date = today
    state.draw.tiers = generateTiers(goal, today, state.settings)
  }
}

export function rebuildTiers() {
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
}

/** 今天已经用掉的次数：共享模式看全局，每目标模式看当前目标 */
function usedToday() {
  if (state.settings.drawQuota === 'perGoal') {
    const g = activeGoal()
    return Number((state.draw.usedByGoal || {})[g.id]) || 0
  }
  return Number(state.draw.used) || 0
}

export function drawRemaining() {
  refreshDaily()
  return clamp(state.settings.dailyDraws - usedToday(), 0, 3)
}

export function performDraw() {
  refreshDaily()
  if (drawRemaining() <= 0) {
    return { ok: false, reason: 'limit' }
  }

  const tiers = state.draw.tiers
  const kind = rollTier(tiers)
  const goal = activeGoal()
  const amount = tiers[kind] ? tiers[kind].amount : 0
  let achievements = []

  if (amount > 0) {
    achievements = applyToGoal(goal, amount).achievements
  }

  if (state.settings.drawQuota === 'perGoal') {
    const m = state.draw.usedByGoal || (state.draw.usedByGoal = {})
    m[goal.id] = (Number(m[goal.id]) || 0) + 1
  } else {
    state.draw.used += 1
  }
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
  syncGoalTarget(g)
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
  // 有子目标时，金额以子目标合计为准
  syncGoalTarget(g)

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

/** 重新计算大目标的已存金额 / 金额合计 / 完成状态 */
function recalcGoal(g) {
  let childSum = 0
  for (let i = 0; i < (g.children || []).length; i++) childSum += g.children[i].saved
  if (g.ownSaved == null) g.ownSaved = 0
  g.saved = Math.round((childSum + g.ownSaved) * 100) / 100
  syncGoalTarget(g)
  g.doneAt = g.saved >= g.target ? g.doneAt || Date.now() : null
}

/** 就地修改单个子目标（首页点子目标卡片进来的快捷编辑） */
export function updateChild(goalId, childId, patch) {
  const g = findGoal(goalId)
  if (!g) return false
  const kids = g.children || []
  let c = null
  for (let i = 0; i < kids.length; i++) if (kids[i].id === childId) c = kids[i]
  if (!c) return false
  if (patch.name != null) c.name = String(patch.name).trim().slice(0, 24) || c.name
  if (patch.target != null) c.target = Math.max(1, Number(patch.target) || 1)
  if (patch.saved != null) c.saved = Math.max(0, Number(patch.saved) || 0)
  if (patch.priority != null) c.priority = clamp(Number(patch.priority) || 1, 1, 99)
  c.doneAt = c.saved >= c.target ? c.doneAt || Date.now() : null
  recalcGoal(g)
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
  return true
}

/** 删除子目标：已存的钱退回大目标，不会凭空消失 */
export function deleteChild(goalId, childId) {
  const g = findGoal(goalId)
  if (!g) return false
  const kids = g.children || []
  let target = null
  for (let i = 0; i < kids.length; i++) if (kids[i].id === childId) target = kids[i]
  if (!target) return false
  g.children = kids.filter(function (c) {
    return c.id !== childId
  })
  g.ownSaved = Math.round(((g.ownSaved || 0) + (target.saved || 0)) * 100) / 100
  // 优先级重置成 1..n，避免出现断号
  g.children.sort(function (a, b) {
    return (a.priority || 99) - (b.priority || 99)
  })
  for (let i = 0; i < g.children.length; i++) g.children[i].priority = i + 1
  recalcGoal(g)
  state.draw.tiers = generateTiers(activeGoal(), state.draw.date || todayStr(), state.settings)
  save()
  return true
}

export function deleteGoal(id) {  if (state.goals.length <= 1) return false
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
  // 换背景之前，先把当前这张的压暗参数存下来，切回来还能还原
  const beforeKey = currentBgKey()
  const bgChanged = patch.theme != null || patch.bgMode != null || patch.userBgId != null
  if (bgChanged && beforeKey) {
    storeDimPreset(state.settings, beforeKey)
  }

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
  if (patch.dimX != null) state.settings.dimX = clamp(numOr(patch.dimX, 50), 0, 100)
  if (patch.dimY != null) state.settings.dimY = clamp(numOr(patch.dimY, 20), 0, 100)
  if (patch.dimSpread != null) state.settings.dimSpread = clamp(numOr(patch.dimSpread, 100), 60, 200)
  if (patch.dimStrength != null) state.settings.dimStrength = clamp(numOr(patch.dimStrength, 100), 20, 180)
  if (patch.bgZoom != null) state.settings.bgZoom = clamp(numOr(patch.bgZoom, 1), 1, 3)
  if (patch.bgOffX != null) state.settings.bgOffX = clamp(numOr(patch.bgOffX, 0), -80, 80)
  if (patch.bgOffY != null) state.settings.bgOffY = clamp(numOr(patch.bgOffY, 0), -80, 80)
  if (patch.drawQuota != null) state.settings.drawQuota = patch.drawQuota === 'perGoal' ? 'perGoal' : 'shared'

  // 切到「自定义图片」但还没选具体哪张时，默认落到库里的第一张
  if (state.settings.bgMode === 'image' && !state.settings.userBgId) {
    const own = loadUserBgs()
    if (own.length) state.settings.userBgId = own[0].id
  }

  const dimTouched =
    patch.dimX != null || patch.dimY != null || patch.dimSpread != null || patch.dimStrength != null
  if (dimTouched) {
    storeDimPreset(state.settings, currentBgKey())
  }

  // 换到另一张背景：把这张自己的压暗参数装回去，没调过就用默认
  if (bgChanged) {
    const k = currentBgKey()
    applyDimValues(state.settings, (k && state.settings.dimPresets[k]) || null)
  }

  save()
}

/* ---------------- 压暗：每张背景各存一套 ---------------- */

function dimSnapshot(s) {
  return {
    x: clamp(numOr(s.dimX, 50), 0, 100),
    y: clamp(numOr(s.dimY, 20), 0, 100),
    spread: clamp(numOr(s.dimSpread, 100), 60, 200),
    strength: clamp(numOr(s.dimStrength, 100), 20, 180)
  }
}

function isDimDefault(v) {
  return v.x === 50 && v.y === 20 && v.spread === 100 && v.strength === 100
}

/** 把当前值存到某张背景名下；值等于默认就不存，避免出现「没调过却标记已调」 */
function storeDimPreset(s, key) {
  if (!key) return
  const snap = dimSnapshot(s)
  if (isDimDefault(snap)) delete s.dimPresets[key]
  else s.dimPresets[key] = snap
}

function applyDimValues(s, v) {
  const d = v || { x: 50, y: 20, spread: 100, strength: 100 }
  s.dimX = clamp(numOr(d.x, 50), 0, 100)
  s.dimY = clamp(numOr(d.y, 20), 0, 100)
  s.dimSpread = clamp(numOr(d.spread, 100), 60, 200)
  s.dimStrength = clamp(numOr(d.strength, 100), 20, 180)
}

/**
 * 当前生效背景的标识：
 * - 立绘主题 → 'theme:<主题 id>'
 * - 自添图片 → 'user:<图片 id>'
 * - 纯色 / 渐变 → ''（没有图，压暗只跟随全局默认）
 */
export function currentBgKey(st) {
  const s = st || (state && state.settings) || {}
  if (s.bgMode === 'image') {
    const b = getActiveUserBg()
    return b ? 'user:' + b.id : ''
  }
  if (s.bgMode === 'theme') return 'theme:' + (s.theme || 'default')
  return ''
}

/** 把这张背景的压暗恢复默认（同时删掉存下来的那套参数） */
export function resetDimForCurrentBg() {
  const k = currentBgKey()
  if (k) delete state.settings.dimPresets[k]
  applyDimValues(state.settings, null)
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

/* ---------------- 用户自添背景：IndexedDB 存图，内存只留 objectURL ---------------- */

/** 内存视图：[{ id, name, addedAt, size, url, thumbUrl }]，url 是 blob: 地址 */
let userBgList = []
let userBgReady = false
let userBgLoading = null
let bgBackend = 'idb' // 'idb' | 'ls'（打不开 IndexedDB 时退回 localStorage）

function revokeItem(it) {
  if (!it) return
  try {
    if (it.url && it.url.indexOf('blob:') === 0) URL.revokeObjectURL(it.url)
  } catch (e) {}
  try {
    if (it.thumbUrl && it.thumbUrl !== it.url && it.thumbUrl.indexOf('blob:') === 0) {
      URL.revokeObjectURL(it.thumbUrl)
    }
  } catch (e) {}
}

/** 同步读：migrate / updateSettings 用。预热没跑完时是空数组，交完就是全量 */
function loadUserBgs() {
  return userBgList
}

function legacyPersist(list) {
  const arr = list.map(function (b) {
    return {
      id: b.id,
      name: b.name,
      data: b.data || b.url,
      thumb: b.thumbData || b.thumbUrl || b.data || b.url,
      addedAt: b.addedAt
    }
  })
  try {
    localStorage.setItem(USERBG_KEY, JSON.stringify(arr))
    return true
  } catch (e) {
    return false
  }
}

function readLegacyBgs() {
  let arr = []
  try {
    arr = JSON.parse(safeGet(USERBG_KEY) || '[]')
  } catch (e) {
    arr = []
  }
  if (!Array.isArray(arr)) arr = []
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i]
    if (!b || !b.id || !b.data) continue
    const thumb = b.thumb || b.data
    out.push({
      id: String(b.id),
      name: String(b.name || '我的背景').slice(0, 24),
      addedAt: Number(b.addedAt) || Date.now(),
      size: 0,
      data: b.data,
      thumbData: thumb,
      url: b.data,
      thumbUrl: thumb
    })
  }
  if (!out.length) {
    const legacy = safeGet(IMG_KEY)
    if (legacy) {
      out.push({
        id: 'ub_legacy',
        name: '我的背景',
        addedAt: Date.now(),
        size: 0,
        data: legacy,
        thumbData: legacy,
        url: legacy,
        thumbUrl: legacy
      })
      legacyPersist(out)
      try { localStorage.removeItem(IMG_KEY) } catch (e) {}
      memoryFallback[IMG_KEY] = null
    }
  }
  return out
}

/**
 * 把 localStorage 里的旧数据搬进 IndexedDB。
 * 幂等：按 id 跳过已有的，中途失败不清旧键，下次启动接着搬。
 */
async function syncLegacyToIdb(existing) {
  let arr = null
  try {
    arr = JSON.parse(safeGet(USERBG_KEY) || 'null')
  } catch (e) {
    arr = null
  }
  let src = Array.isArray(arr)
    ? arr.filter(function (b) { return b && b.id && b.data })
    : []
  if (!src.length) {
    const one = safeGet(IMG_KEY)
    if (one) src = [{ id: 'ub_legacy', name: '我的背景', data: one, addedAt: Date.now() }]
  }
  if (!src.length) return existing

  const have = {}
  for (let i = 0; i < existing.length; i++) have[existing[i].id] = 1

  const added = []
  let failed = false
  for (let i = 0; i < src.length; i++) {
    const b = src[i]
    if (have[b.id]) continue
    const blob = bgStore.dataUrlToBlob(b.data)
    if (!blob) continue
    const tb = b.thumb && b.thumb !== b.data ? bgStore.dataUrlToBlob(b.thumb) : blob
    const meta = {
      id: String(b.id),
      name: String(b.name || '我的背景').slice(0, 24),
      addedAt: Number(b.addedAt) || Date.now(),
      size: blob.size || 0
    }
    try {
      await bgStore.putBg({
        id: meta.id,
        name: meta.name,
        addedAt: meta.addedAt,
        size: meta.size,
        blob: blob,
        thumb: tb || blob
      })
      added.push(meta)
      have[meta.id] = 1
    } catch (e) {
      failed = true
      break
    }
  }

  // 确认旧数据全部有着落，才删掉旧键（否则保留，下次继续）
  if (!failed) {
    try { localStorage.removeItem(USERBG_KEY) } catch (e) {}
    memoryFallback[USERBG_KEY] = null
    try { localStorage.removeItem(IMG_KEY) } catch (e) {}
    memoryFallback[IMG_KEY] = null
  }
  return existing.concat(added)
}

/**
 * 预热：读取索引 + 图片，生成 objectURL 填进内存。
 * main.js 在首次渲染前 await 它，之后所有读路径都是同步的。
 */
export function initUserBgs() {
  if (userBgLoading) return userBgLoading
  userBgLoading = (async function () {
    const ok = await bgStore.probe()
    if (!ok) {
      bgBackend = 'ls'
      userBgList = readLegacyBgs()
      userBgReady = true
      return userBgList
    }

    let metas = []
    try {
      metas = await bgStore.getAllMeta()
    } catch (e) {
      metas = []
    }
    metas = await syncLegacyToIdb(metas)

    const list = []
    for (let i = 0; i < metas.length; i++) {
      const m = metas[i]
      try {
        const blob = await bgStore.getBlob(m.id)
        if (!blob) continue
        const url = URL.createObjectURL(blob)
        const th = await bgStore.getThumb(m.id)
        const thumbUrl = th ? URL.createObjectURL(th) : url
        list.push({
          id: m.id,
          name: m.name || '我的背景',
          addedAt: Number(m.addedAt) || 0,
          size: Number(m.size) || 0,
          url: url,
          thumbUrl: thumbUrl
        })
      } catch (e) {
        // 这一张读不出来就跳过，不让整页挂掉
      }
    }

    userBgList.forEach(revokeItem)
    userBgList = list
    userBgReady = true

    // 运行中重新预热时校正选中项；首次启动交给 migrate()
    if (state && state.settings) {
      const has = list.some(function (b) { return b.id === state.settings.userBgId })
      if (!has) {
        state.settings.userBgId = list.length ? list[0].id : ''
        if (!list.length && state.settings.bgMode === 'image') state.settings.bgMode = 'theme'
        save()
      }
    }

    bgStore.requestPersist()
    return list
  })()
  return userBgLoading
}

export function userBgsReady() {
  return userBgReady
}

export function userBgBackend() {
  return bgBackend
}

/** 列表 + 占用空间，设置页显示「已存 N 张 · 共 x MB」 */
export function userBgUsage() {
  let bytes = 0
  for (let i = 0; i < userBgList.length; i++) bytes += userBgList[i].size || 0
  return { count: userBgList.length, bytes: bytes }
}

export function listUserBgs() {
  return userBgList.slice()
}

export function getActiveUserBg() {
  if (!userBgList.length) return null
  const id = state && state.settings ? state.settings.userBgId : ''
  for (let i = 0; i < userBgList.length; i++) {
    if (userBgList[i].id === id) return userBgList[i]
  }
  return userBgList[0]
}

/** 加一张自添背景：blob 全图 + 可选缩略图 Blob；存不进去返回 null */
export async function addUserBg(blob, thumbBlob, name) {
  if (!blob) return null
  const item = {
    id: uid('ub'),
    name: String(name || '我的背景 ' + (userBgList.length + 1)).slice(0, 24),
    addedAt: Date.now(),
    size: blob.size || 0
  }

  if (bgBackend === 'idb') {
    try {
      await bgStore.putBg({
        id: item.id,
        name: item.name,
        addedAt: item.addedAt,
        size: item.size,
        blob: blob,
        thumb: thumbBlob || blob
      })
    } catch (e) {
      return null
    }
    item.url = URL.createObjectURL(blob)
    item.thumbUrl = thumbBlob ? URL.createObjectURL(thumbBlob) : item.url
  } else {
    const data = await bgStore.blobToDataUrl(blob)
    if (!data) return null
    const thumb = thumbBlob ? await bgStore.blobToDataUrl(thumbBlob) : data
    item.data = data
    item.thumbData = thumb
    item.url = data
    item.thumbUrl = thumb
    if (!legacyPersist(userBgList.concat([item]))) return null
  }

  userBgList.push(item)
  return item
}

export async function removeUserBg(id) {
  let at = -1
  for (let i = 0; i < userBgList.length; i++) {
    if (userBgList[i].id === id) {
      at = i
      break
    }
  }
  if (at < 0) return false

  if (bgBackend === 'idb') {
    try {
      await bgStore.delBg(id)
    } catch (e) {
      return false
    }
  } else {
    const rest = userBgList.slice(0, at).concat(userBgList.slice(at + 1))
    if (!legacyPersist(rest)) return false
  }

  const item = userBgList.splice(at, 1)[0]
  revokeItem(item)
  if (state.settings.dimPresets) delete state.settings.dimPresets['user:' + id]
  if (state.settings.userBgId === id) {
    state.settings.userBgId = userBgList.length ? userBgList[0].id : ''
    if (!userBgList.length && state.settings.bgMode === 'image') state.settings.bgMode = 'theme'
  }
  save()
  return true
}

/** 当前选中的自添背景图（appearance / bg-transform 都走这里） */
export function getBgImage() {
  const b = getActiveUserBg()
  return b ? b.url || b.data || '' : ''
}

/** 导出备份：图片从 IndexedDB 读回、转成 base64 塞进 JSON，格式与旧版一致 */
export async function exportData() {
  const data = JSON.parse(JSON.stringify(state))
  const cur = getActiveUserBg()
  const out = []
  for (let i = 0; i < userBgList.length; i++) {
    const b = userBgList[i]
    let d = b.data || ''
    let t = b.thumbData || ''
    if (!d) {
      try {
        const blob = await bgStore.getBlob(b.id)
        d = blob ? await bgStore.blobToDataUrl(blob) : ''
      } catch (e) {
        d = ''
      }
    }
    if (!t && d) {
      try {
        const th = await bgStore.getThumb(b.id)
        t = th ? await bgStore.blobToDataUrl(th) : d
      } catch (e) {
        t = d
      }
    }
    if (!d) continue
    out.push({ id: b.id, name: b.name, addedAt: b.addedAt, data: d, thumb: t || d })
  }
  data.userBgs = out
  data.bgImage = ''
  if (cur) {
    for (let i = 0; i < out.length; i++) {
      if (out[i].id === cur.id) {
        data.bgImage = out[i].data
        break
      }
    }
  }
  return JSON.stringify(data, null, 2)
}

export async function importData(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    return false
  }
  if (!obj || !Array.isArray(obj.goals) || obj.goals.length === 0) return false

  const bg = obj.bgImage || ''
  let bgs = Array.isArray(obj.userBgs)
    ? obj.userBgs.filter(function (b) {
        return b && b.id && b.data
      })
    : []
  if (!bgs.length && bg) {
    bgs = [{ id: 'ub_import', name: '导入的背景', data: bg, thumb: bg, addedAt: Date.now() }]
  }
  delete obj.bgImage
  delete obj.userBgs

  // 备份是整份替换：先清空现有图库
  if (bgBackend === 'idb') {
    try {
      await bgStore.clearAll()
    } catch (e) {
      return false
    }
  }
  userBgList.forEach(revokeItem)
  userBgList = []

  const next = []
  for (let i = 0; i < bgs.length; i++) {
    const b = bgs[i]
    const blob = bgStore.dataUrlToBlob(b.data)
    if (!blob) continue
    const tb = b.thumb && b.thumb !== b.data ? bgStore.dataUrlToBlob(b.thumb) : blob
    const item = {
      id: String(b.id),
      name: String(b.name || '我的背景').slice(0, 24),
      addedAt: Number(b.addedAt) || Date.now(),
      size: blob.size || 0
    }
    if (bgBackend === 'idb') {
      try {
        await bgStore.putBg({
          id: item.id,
          name: item.name,
          addedAt: item.addedAt,
          size: item.size,
          blob: blob,
          thumb: tb || blob
        })
      } catch (e) {
        continue
      }
      item.url = URL.createObjectURL(blob)
      item.thumbUrl = tb ? URL.createObjectURL(tb) : item.url
    } else {
      item.data = b.data
      item.thumbData = b.thumb || b.data
      item.url = b.data
      item.thumbUrl = item.thumbData
    }
    next.push(item)
  }

  userBgList = next
  if (bgBackend !== 'idb') legacyPersist(next)

  state = migrate(obj)
  if (!findGoal(state.activeGoal)) state.activeGoal = state.goals[0].id
  // 备份里指向的那张没导进来，就落到第一张
  const hasCur = state.settings.userBgId
    ? next.some(function (b) { return b.id === state.settings.userBgId })
    : false
  if (!hasCur) {
    state.settings.userBgId = next.length ? next[0].id : ''
    if (!next.length && state.settings.bgMode === 'image') state.settings.bgMode = 'theme'
  }
  refreshDaily(true)
  save()
  return true
}

export async function resetAll() {
  state = defaultState()
  refreshDaily(true)
  userBgList.forEach(revokeItem)
  userBgList = []
  try {
    localStorage.removeItem(USERBG_KEY)
  } catch (e) {}
  memoryFallback[USERBG_KEY] = null
  if (bgBackend === 'idb') {
    try {
      await bgStore.clearAll()
    } catch (e) {}
  }
  save()
}