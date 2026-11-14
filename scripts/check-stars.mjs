// 临时验证脚本：喂一个假 canvas，跑帧，观察群星位置是否真的会重排
const arcs = []
const ctx = {
  clearRect() {},
  beginPath() {},
  arc(x, y, r) {
    arcs.push([x, y, r])
  },
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

globalThis.window = {
  innerWidth: 400,
  innerHeight: 800,
  devicePixelRatio: 2,
  addEventListener() {}
}
globalThis.document = { addEventListener() {}, hidden: false }

let pending = null
globalThis.requestAnimationFrame = function (cb) {
  pending = cb
  return 1
}
globalThis.cancelAnimationFrame = function () {}

const el = { getContext: () => ctx, style: {}, width: 0, height: 0 }

const mod = await import('../src/effects.js')
mod.initEffects(el)
mod.setEffect({ enabled: true, kind: 'stars', color: '#a78bfa' })

let t = 0
function frames(n) {
  for (let i = 0; i < n; i++) {
    const cb = pending
    pending = null
    t += 40
    cb(t)
  }
}

function snapshot() {
  arcs.length = 0
  frames(1)
  return arcs.slice()
}

frames(10)
const a = snapshot()

// 跑到 1600 帧（约 64 秒虚拟时间），中间必然发生过一次重排
frames(1560)
const b = snapshot()

function near(p, q, eps) {
  return Math.abs(p[0] - q[0]) < eps && Math.abs(p[1] - q[1]) < eps
}

let same = 0
for (const p of a) if (b.some((q) => near(p, q, 0.5))) same++

console.log('星数 A/B:', a.length, b.length)
console.log('位置未变的星:', same, '/', a.length)
console.log('A 前 3 颗:', a.slice(0, 3).map((p) => p.map((v) => Math.round(v))))
console.log('B 前 3 颗:', b.slice(0, 3).map((p) => p.map((v) => Math.round(v))))

// 再跑一段时间，确认不会越跑越少（淡出后必须补回来）
frames(400)
const c = snapshot()
console.log('再过 400 帧星数:', c.length)
