/**
 * 背景粒子层
 * 只用 2D canvas 画圆 / 短线，低端安卓设备也能跑
 */

const cfg = {
  enabled: true,
  theme: 'default',
  color: '#a78bfa',
  density: 32
}

let canvas = null
let ctx = null
let raf = 0
let particles = []
let w = 0
let h = 0
let running = false
let lastTime = 0

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function makeParticle(initial) {
  const theme = cfg.theme
  const p = {
    x: rand(0, w),
    y: initial ? rand(0, h) : rand(-40, -8),
    r: rand(1, 2.4),
    a: rand(0.18, 0.7),
    ph: rand(0, 6.28),
    vx: 0,
    vy: 0
  }

  if (theme === 'congyu') {
    p.kind = Math.random() < 0.55 ? 'rain' : 'dot'
    p.vy = rand(1.4, 3.2)
    p.vx = rand(0.25, 0.7)
    p.len = rand(8, 20)
    p.r = rand(0.8, 1.6)
    p.y = initial ? rand(0, h) : rand(-40, -10)
  } else if (theme === 'miku') {
    p.kind = Math.random() < 0.5 ? 'snow' : 'dot'
    p.vy = rand(0.25, 0.9)
    p.vx = rand(-0.25, 0.25)
    p.r = rand(1, 2.6)
    p.y = initial ? rand(0, h) : rand(-30, -6)
  } else if (theme === 'gancheng') {
    p.kind = 'float'
    p.vy = rand(-0.65, -0.2)
    p.vx = rand(-0.2, 0.2)
    p.r = rand(1.2, 3)
    p.y = initial ? rand(0, h) : rand(h + 10, h + 50)
  } else if (theme === 'futaba') {
    p.kind = 'dot'
    p.vx = rand(0.35, 1.1)
    p.vy = rand(-0.12, 0.12)
    p.r = rand(1, 2.2)
    p.x = initial ? rand(0, w) : rand(-30, -6)
  } else {
    p.kind = 'float'
    p.vy = rand(-0.32, -0.08)
    p.vx = rand(-0.1, 0.1)
    p.r = rand(0.8, 2)
    p.y = initial ? rand(0, h) : rand(h + 6, h + 30)
  }
  return p
}

function reset(p) {
  const fresh = makeParticle(false)
  for (const k in fresh) p[k] = fresh[k]
  if (cfg.theme === 'futaba') {
    p.x = -20
    p.y = rand(0, h)
  } else if (cfg.theme === 'gancheng' || p.kind === 'float') {
    p.y = h + rand(4, 40)
    p.x = rand(0, w)
  } else {
    p.y = rand(-40, -8)
    p.x = rand(0, w)
  }
}

function ensureCount() {
  while (particles.length < cfg.density) particles.push(makeParticle(true))
  if (particles.length > cfg.density) particles.length = cfg.density
}

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = cfg.color
  ctx.strokeStyle = cfg.color

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    p.ph += 0.012
    p.x += p.vx + Math.sin(p.ph) * 0.16
    p.y += p.vy

    const outX = p.x < -50 || p.x > w + 50
    const outY = p.y < -60 || p.y > h + 60
    if (outX || outY) {
      reset(p)
      continue
    }

    ctx.globalAlpha = p.a

    if (p.kind === 'rain') {
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * p.len * 0.5, p.y - p.len)
      ctx.stroke()
    } else if (p.kind === 'snow') {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, 6.2832)
      ctx.fill()
      ctx.globalAlpha = p.a * 0.5
      ctx.beginPath()
      ctx.moveTo(p.x - p.r * 1.8, p.y)
      ctx.lineTo(p.x + p.r * 1.8, p.y)
      ctx.moveTo(p.x, p.y - p.r * 1.8)
      ctx.lineTo(p.x, p.y + p.r * 1.8)
      ctx.lineWidth = 0.7
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, 6.2832)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  raf = requestAnimationFrame(tick)
}

function tick(now) {
  if (!running) return
  if (!now) now = Date.now()
  const dt = now - lastTime
  lastTime = now
  if (dt > 34) {
    draw()
  } else {
    raf = requestAnimationFrame(tick)
  }
}

function resize() {
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  particles = []
  ensureCount()
}

export function initParticles(el) {
  canvas = el
  if (!canvas || !canvas.getContext) return
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop()
    } else if (cfg.enabled) {
      start()
    }
  })
}

export function setParticles(patch) {
  for (const k in patch) cfg[k] = patch[k]
  ensureCount()
  if (cfg.enabled) start()
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