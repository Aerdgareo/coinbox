// 临时：观察樱花遭遇阵风的横向位移（按最近邻配对花瓣，避免重生跳变干扰）
const ctx = {
  clearRect() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  scale() {},
  fillText() {},
  quadraticCurveTo() {},
  setTransform() {},
  fillStyle: '',
  strokeStyle: '',
  globalAlpha: 1,
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: ''
}

let xs = []
const origTranslate = ctx.translate
ctx.translate = function (x, y) {
  xs.push(x)
  origTranslate(x, y)
}

globalThis.window = { innerWidth: 400, innerHeight: 800, devicePixelRatio: 1, addEventListener() {} }
globalThis.document = { addEventListener() {}, hidden: false }
let pending = null
globalThis.requestAnimationFrame = (cb) => {
  pending = cb
  return 1
}
globalThis.cancelAnimationFrame = () => {}

const el = { getContext: () => ctx, style: {}, width: 0, height: 0 }
const mod = await import('../src/effects.js')
mod.initEffects(el)
mod.setEffect({ enabled: true, kind: 'sakura', color: '#ff9fb8' })

let t = 0
function frame() {
  xs = []
  const cb = pending
  pending = null
  t += 40
  cb(t)
  return xs.slice()
}

frame()
let prev = frame()

const perFrameDx = []
let gusts = 0
let gusting = false
let gustStart = 0

for (let f = 0; f < 4200; f++) {
  // 4200 帧 ≈ 150 秒（虚拟时间）
  const cur = frame()
  const used = new Set()
  const dxs = []
  for (let i = 0; i < cur.length; i++) {
    let best = -1
    let bestD = 5
    for (let j = 0; j < prev.length; j++) {
      if (used.has(j)) continue
      const d = Math.abs(prev[j] - cur[i])
      if (d < bestD) {
        bestD = d
        best = j
      }
    }
    if (best >= 0) {
      used.add(best)
      dxs.push(cur[i] - prev[best])
    }
  }
  const mean = dxs.reduce((s, v) => s + v, 0) / Math.max(1, dxs.length)
  perFrameDx.push(mean)
  const g = Math.abs(mean) > 0.55
  if (g && !gusting) {
    gusts++
    gustStart = f
  }
  gusting = g
  prev = cur
}

const abs = perFrameDx.map(Math.abs).sort((a, b) => a - b)
const gustFrames = perFrameDx.filter((v) => Math.abs(v) > 0.55).length
const maxDrift = abs[abs.length - 1]
const dir = perFrameDx.filter((v) => Math.abs(v) > 0.55).map((v) => (v > 0 ? 1 : 0))
const right = dir.filter((v) => v === 1).length

console.log('150 秒虚拟时间，每帧「全体花瓣平均横移」:')
console.log('  中位 %s  95分位 %s  最大 %s px/帧',
  abs[Math.floor(abs.length / 2)].toFixed(3), abs[Math.floor(abs.length * 0.95)].toFixed(3), maxDrift.toFixed(2))
console.log('  最大相当于 %s px/s', (maxDrift * 27.8).toFixed(0))
console.log('阵风帧占比 %s%%，识别到 %s 阵（平均每 %s 秒一阵）',
  ((gustFrames / 4200) * 100).toFixed(1), gusts, (150 / Math.max(1, gusts)).toFixed(0))
console.log('风向分布：向右 %s 帧 / 向左 %s 帧', right, dir.length - right)
