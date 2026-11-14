/**
 * 氛围特效层
 * 下雪 / 群星 / 音符 / 樱花，共用一个 canvas，约 25fps
 * 只用 2D 基础图形，低端安卓也能跑
 */

const cfg = {
  enabled: false,
  kind: 'none',
  color: '#a78bfa'
}

const PETAL_COLORS = ['#ffd6e3', '#ffc2d6', '#ffb0c8', '#ffe6ef', '#ff9fb8']
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬']

let canvas = null
let ctx = null
let raf = 0
let running = false
let lastTime = 0
let w = 0
let h = 0
let dpr = 1

let items = []
let ripples = []
let shooting = null
let nextShoot = 0
let clock = 0

/** 群星每隔这么多帧重新排布一次位置（约 23~36 秒） */
const STAR_SHUFFLE_MIN = 650
const STAR_SHUFFLE_MAX = 1000
/** 单颗星的淡出/淡入速度（每帧） */
const STAR_FADE_OUT = 0.075
const STAR_FADE_IN = 0.055
let nextShuffle = 0

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function countByArea(perPoint, min, max) {
  const n = Math.round((w * h) / perPoint)
  return Math.max(min, Math.min(max, n))
}

/* ---------- 生成 ---------- */

function makeSnow(initial) {
  const r = rand(0.8, 2.6)
  return {
    x: rand(0, w),
    y: initial ? rand(0, h) : rand(-40, -6),
    r: r,
    vy: rand(0.35, 1.35) * (r > 2 ? 0.8 : 1),
    vx: rand(-0.12, 0.12),
    ph: rand(0, 6.283),
    amp: rand(0.2, 0.85),
    a: rand(0.45, 0.95)
  }
}

function makeStar(initial) {
  const big = Math.random() < 0.16
  return {
    x: rand(0, w),
    y: initial ? rand(0, h) : rand(-30, -4),
    r: big ? rand(1.5, 2.3) : rand(0.5, 1.3),
    ph: rand(0, 6.283),
    sp: rand(0.008, 0.032),
    a: rand(0.2, 0.85),
    vy: rand(0.01, 0.05),
    big: big,
    fade: initial ? 1 : 0,
    state: initial ? 'live' : 'in',
    hold: 0
  }
}

/** 换一个位置重新排这颗星（保留淡入，看不出来是瞬移） */
function respawnStar(p) {
  const big = Math.random() < 0.16
  p.x = rand(0, w)
  p.y = rand(0, h)
  p.r = big ? rand(1.5, 2.3) : rand(0.5, 1.3)
  p.ph = rand(0, 6.283)
  p.sp = rand(0.006, 0.034)
  p.a = rand(0.2, 0.85)
  p.vy = rand(0.01, 0.05)
  p.big = big
}

function makeNote(initial) {
  return {
    x: rand(w * 0.06, w * 0.94),
    y: initial ? rand(h * 0.06, h * 0.98) : h + rand(10, 90),
    vy: rand(-1.25, -0.55),
    vx: rand(-0.22, 0.22),
    ph: rand(0, 6.283),
    size: rand(14, 26),
    glyph: pick(NOTE_GLYPHS),
    a: rand(0.36, 0.8),
    fade: 0,
    life: initial ? Math.round(rand(60, 320)) : 0,
    span: rand(420, 880)
  }
}

function makePetal(initial) {
  return {
    x: rand(-20, w + 20),
    y: initial ? rand(0, h) : rand(-40, -8),
    r: rand(5, 9.6),
    vy: rand(0.3, 0.85),
    vx: rand(-0.15, 0.5),
    ph: rand(0, 6.283),
    amp: rand(0.4, 1.1),
    rot: rand(0, 6.283),
    spin: rand(0.006, 0.022) * (Math.random() < 0.5 ? -1 : 1),
    squash: rand(0.45, 0.8),
    color: pick(PETAL_COLORS),
    a: rand(0.45, 0.92)
  }
}

function spawn(kind, initial) {
  if (kind === 'snow') return makeSnow(initial)
  if (kind === 'stars') return makeStar(initial)
  if (kind === 'notes') return makeNote(initial)
  if (kind === 'sakura') return makePetal(initial)
  return null
}

function targetCount() {
  if (cfg.kind === 'snow') return countByArea(12000, 55, 150)
  if (cfg.kind === 'stars') return countByArea(13000, 55, 160)
  if (cfg.kind === 'notes') return countByArea(40000, 14, 28)
  if (cfg.kind === 'sakura') return countByArea(34000, 18, 38)
  return 0
}

function ensure() {
  const n = targetCount()
  while (items.length > n) items.length = n
  while (items.length < n) {
    const p = spawn(cfg.kind, true)
    if (!p) break
    items.push(p)
  }
  if (cfg.kind !== 'notes') ripples = []
}

/* ---------- 绘制 ---------- */

function drawSnow(p) {
  // 亮背景（比如白天立绘）上纯白看不清，先垫一层很淡的暗色底
  ctx.fillStyle = 'rgba(30,48,80,1)'
  ctx.globalAlpha = p.a * 0.3
  ctx.beginPath()
  ctx.arc(p.x, p.y + 0.5, p.r + 0.7, 0, 6.2832)
  ctx.fill()

  ctx.fillStyle = '#d7e9ff'
  ctx.globalAlpha = p.a
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r, 0, 6.2832)
  ctx.fill()
  if (p.r > 2) {
    ctx.globalAlpha = p.a * 0.16
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * 2.6, 0, 6.2832)
    ctx.fill()
  }
}

function drawStar(p) {
  const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock * p.sp * 3.2 + p.ph))
  const base = p.a * tw * p.fade
  ctx.fillStyle = '#f4f7ff'
  ctx.strokeStyle = '#f4f7ff'
  ctx.globalAlpha = base
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r, 0, 6.2832)
  ctx.fill()
  if (p.big) {
    const arm = p.r * (3.4 + tw * 2.2)
    ctx.globalAlpha = base * 0.55
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(p.x - arm, p.y)
    ctx.lineTo(p.x + arm, p.y)
    ctx.moveTo(p.x, p.y - arm)
    ctx.lineTo(p.x, p.y + arm)
    ctx.stroke()
  }
}

function drawNote(p) {
  ctx.font = p.size + 'px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 先画一层暗色描影，亮背景上也能看清
  ctx.fillStyle = 'rgba(12,16,30,1)'
  ctx.globalAlpha = p.a * p.fade * 0.22
  ctx.fillText(p.glyph, p.x + 1, p.y + 1)
  ctx.fillStyle = cfg.color
  ctx.globalAlpha = p.a * p.fade
  ctx.fillText(p.glyph, p.x, p.y)
}

function petalPath(r) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-r, -r * 0.72, 0, -r * 2)
  ctx.quadraticCurveTo(r, -r * 0.72, 0, 0)
}

function drawPetal(p) {
  const r = p.r
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  ctx.scale(1, p.squash + (1 - p.squash) * Math.abs(Math.cos(p.rot * 1.7)))

  // 暗色底衬，浅色立绘上也能看出花瓣轮廓
  ctx.fillStyle = 'rgba(72,28,46,1)'
  ctx.globalAlpha = p.a * 0.22
  ctx.save()
  ctx.translate(0.9, 0.9)
  petalPath(r)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = p.color
  ctx.globalAlpha = p.a
  petalPath(r)
  ctx.fill()
  ctx.restore()
}

function drawRipples() {
  if (!ripples.length) return
  ctx.strokeStyle = cfg.color
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]
    r.age += 1
    const k = r.age / r.life
    if (k >= 1) {
      ripples.splice(i, 1)
      continue
    }
    ctx.globalAlpha = (1 - k) * 0.5
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(r.x, r.y, 6 + k * r.max, 0, 6.2832)
    ctx.stroke()
  }
}

function drawShooting() {
  if (!shooting) {
    if (clock > nextShoot && cfg.kind === 'stars') {
      shooting = { x: rand(w * 0.1, w * 0.8), y: rand(0, h * 0.42), len: rand(70, 130), age: 0, life: rand(26, 40) }
      nextShoot = clock + rand(420, 900)
    }
    return
  }
  shooting.age += 1
  const k = shooting.age / shooting.life
  if (k >= 1) {
    shooting = null
    return
  }
  const x = shooting.x + k * 120
  const y = shooting.y + k * 62
  const tail = shooting.len * (1 - k * 0.5)
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.5 * (1 - k) * (k < 0.2 ? k / 0.2 : 1)
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - tail * 0.62, y - tail * 0.36)
  ctx.stroke()
  ctx.globalAlpha = 0.75 * (1 - k)
  ctx.beginPath()
  ctx.arc(x, y, 1.6, 0, 6.2832)
  ctx.fill()
}

function rippleTick() {
  if (cfg.kind !== 'notes') return
  if (clock % 26 === 0 && ripples.length < 6) {
    ripples.push({ x: rand(w * 0.14, w * 0.86), y: rand(h * 0.18, h * 0.82), age: 0, life: rand(48, 76), max: rand(52, 108) })
  }
}

function step(p) {
  p.x += (p.vx || 0) + (p.amp ? Math.sin(p.ph) * 0.18 * p.amp : 0)
  p.ph += 0.012
  p.y += p.vy || 0

  if (cfg.kind === 'stars') {
    if (p.state === 'out') {
      if (p.hold > 0) p.hold -= 1
      else {
        p.fade -= STAR_FADE_OUT
        if (p.fade <= 0) {
          p.fade = 0
          respawnStar(p)
          p.state = 'in'
        }
      }
    } else if (p.state === 'in') {
      p.fade += STAR_FADE_IN
      if (p.fade >= 1) {
        p.fade = 1
        p.state = 'live'
      }
    }
  }

  if (cfg.kind === 'sakura') p.rot += p.spin
  if (cfg.kind === 'notes') {
    p.life += 1
    const k = p.life / p.span
    p.fade = k < 0.15 ? k / 0.15 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1
  }
}

/** 全星图错峰熄灭→换位→淡入，看起来像「换了一片星空」而不是硬切 */
function shuffleStars() {
  for (let i = 0; i < items.length; i++) {
    const p = items[i]
    if (p.state === 'live') {
      p.state = 'out'
      p.hold = Math.floor(Math.random() * 32)
    }
  }
  nextShuffle = clock + Math.round(rand(STAR_SHUFFLE_MIN, STAR_SHUFFLE_MAX))
}

function outOfView(p) {
  if (cfg.kind === 'notes') return p.life > p.span || p.y < -40
  return p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)

  if (cfg.kind === 'stars' && clock > nextShuffle) shuffleStars()

  for (let i = 0; i < items.length; i++) {
    const p = items[i]
    step(p)
    if (outOfView(p)) {
      const fresh = spawn(cfg.kind, false)
      if (!fresh) continue
      items[i] = fresh
      continue
    }
    if (cfg.kind === 'snow') drawSnow(p)
    else if (cfg.kind === 'stars') drawStar(p)
    else if (cfg.kind === 'notes') drawNote(p)
    else if (cfg.kind === 'sakura') drawPetal(p)
  }

  rippleTick()
  drawRipples()
  drawShooting()

  ctx.globalAlpha = 1
  raf = requestAnimationFrame(tick)
}

function tick(now) {
  if (!running) return
  if (!now) now = Date.now()
  // 按「距上次绘制」的间隔节流，60Hz 下每帧 dt 很小，用前后帧差会永远不画
  if (now - lastTime >= 36) {
    lastTime = now
    clock += 1
    draw()
  } else {
    raf = requestAnimationFrame(tick)
  }
}

function resize() {
  if (!canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 1.75)
  w = window.innerWidth
  h = window.innerHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  items = []
  ripples = []
  ensure()
}

export function initEffects(el) {
  canvas = el
  if (!canvas || !canvas.getContext) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop()
    else if (cfg.enabled && cfg.kind !== 'none') start()
  })
}

export function setEffect(patch) {
  const prevKind = cfg.kind
  for (const k in patch) cfg[k] = patch[k]
  if (cfg.kind !== prevKind) {
    items = []
    ripples = []
    shooting = null
    nextShoot = clock + 200
    nextShuffle = clock + Math.round(rand(STAR_SHUFFLE_MIN, STAR_SHUFFLE_MAX))
  }
  ensure()
  if (cfg.enabled && cfg.kind !== 'none') start()
  else stop()
}

export function start() {
  if (!canvas || running) return
  running = true
  lastTime = 0
  canvas.style.opacity = '1'
  raf = requestAnimationFrame(tick)
}

export function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (canvas) canvas.style.opacity = '0'
}
