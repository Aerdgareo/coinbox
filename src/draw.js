/**
 * 抽奖规则引擎（纯函数，不碰 DOM）
 *
 * 规则：
 * 1. 每天的奖池从「设置里的金额范围」中生成 8 个档位，档位金额每天重新排布
 *    （首档 = 范围下限，末档 = 范围上限，中间随机），跨日不同；
 * 2. 金额越大，中奖概率越小（与攒钱进度无关，进度不影响概率）；
 * 3. 默认范围 1~100 元，可在设置里调整；
 * 4. 没抽中任何档位时给 0.1 元「安慰奖」，不空手；
 * 5. 同一天同一目标结果恒定（按 日期+目标ID 播种），跨日刷新。
 */

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

export function round1(n) {
  return Math.round(n * 10) / 10
}

export function roundAmount(n) {
  if (n < 3) return Math.max(0.1, Math.round(n * 10) / 10)
  if (n < 10) return Math.round(n * 2) / 2
  if (n < 100) return Math.round(n)
  return Math.round(n / 5) * 5
}

export function hashStr(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const TIER_KEYS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']

export const TIER_LABEL = {
  t1: '小奖',
  t2: '小奖+',
  t3: '中奖',
  t4: '中奖+',
  t5: '大奖',
  t6: '大奖+',
  t7: '超大',
  t8: '超大+',
  miss: '安慰奖'
}

/** 没抽中任何档位时的保底金额（元） */
export const MISS_AMOUNT = 0.1

const WEIGHTS = [20, 17, 14, 12, 9, 7, 5, 4]

function buildChances(rnd) {
  const w = []
  for (let i = 0; i < WEIGHTS.length; i++) {
    w.push(Math.max(0.4, WEIGHTS[i] * (1 + (rnd() - 0.5) * 0.14)))
  }

  let sum = 0
  for (let i = 0; i < w.length; i++) sum += w[i]

  let missW = 100 - sum
  if (missW < 10) {
    const k = 90 / sum
    for (let i = 0; i < w.length; i++) w[i] *= k
    sum = 90
    missW = 10
  }
  if (missW > 30) missW = 30

  const total = sum + missW
  const out = {}
  for (let i = 0; i < w.length; i++) {
    out[TIER_KEYS[i]] = Math.round((w[i] / total) * 10000) / 10000
  }
  out.miss = Math.round((missW / total) * 10000) / 10000

  const real = 1 - out.miss
  let acc = 0
  for (let i = 0; i < TIER_KEYS.length - 1; i++) {
    acc += out[TIER_KEYS[i]]
  }
  out[TIER_KEYS[TIER_KEYS.length - 1]] = Math.round((real - acc) * 10000) / 10000
  return out
}

/**
 * 生成每天的 8 档金额。
 *
 * 在「下限 → 上限」的对数区间里把 7 段间距随机打散再归一化：
 * 首档恒等于设置的下限、末档恒等于上限，中间的档位每天重新排布，
 * 所以换个日子打开，奖池金额就不一样了。间距在 0.72~1.28 倍之间浮动，
 * 既保证递增，又能让相邻档位明显拉开或靠近。
 */
function buildAmounts(min, max, rnd) {
  const n = TIER_KEYS.length
  const steps = n - 1
  const span = Math.log(max) - Math.log(min)
  const out = [roundAmount(min)]
  if (!(span > 0.05)) {
    // 上下限几乎相等，没有可分配的区间 → 8 档同额
    for (let i = 1; i < n; i++) out.push(out[0])
    return out
  }

  const gaps = []
  let sum = 0
  for (let i = 0; i < steps; i++) {
    const g = 1 + (rnd() - 0.5) * 0.56
    gaps.push(g)
    sum += g
  }
  const k = steps / sum

  let acc = Math.log(min)
  for (let i = 0; i < steps; i++) {
    acc += (span / steps) * gaps[i] * k
    out.push(roundAmount(Math.exp(acc)))
  }

  // 取整后可能撞档，按最小可读步长往上顶，保持严格递增
  for (let i = 1; i < n; i++) {
    if (out[i] <= out[i - 1]) out[i] = stepUp(out[i - 1])
  }
  return out
}

function stepUp(v) {
  if (v < 3) return Math.round((v + 0.1) * 10) / 10
  if (v < 10) return v + 0.5
  if (v < 100) return v + 1
  return v + 5
}

/**
 * @param {{id:string,target:number,saved:number}} goal
 * @param {string} dateStr  YYYY-MM-DD
 * @param {{drawMin?:number,drawMax?:number}} range
 */
export function generateTiers(goal, dateStr, range) {
  const target = goal && goal.target > 0 ? goal.target : 1000
  const saved = goal ? goal.saved || 0 : 0
  const progress = clamp(saved / target, 0, 1)

  const minRaw = range && range.drawMin != null ? Number(range.drawMin) : 1
  const maxRaw = range && range.drawMax != null ? Number(range.drawMax) : 100
  const min = clamp(minRaw || 1, 0.1, 500)
  const max = clamp(maxRaw || 100, min, 5000)

  const seedStr = (goal ? goal.id : 'x') + '@' + dateStr + '|' + min + '-' + max
  // 两条随机流分开：改动金额排布不会连带改变概率
  const rnd = mulberry32(hashStr(seedStr))
  const rndAmount = mulberry32(hashStr(seedStr + '#amounts'))

  const amounts = buildAmounts(min, max, rndAmount)

  const chances = buildChances(rnd)

  const tiers = {
    date: dateStr,
    progress: Math.round(progress * 1000) / 1000,
    min: min,
    max: max,
    miss: { amount: MISS_AMOUNT, chance: chances.miss }
  }
  for (let i = 0; i < TIER_KEYS.length; i++) {
    const k = TIER_KEYS[i]
    tiers[k] = { amount: amounts[i], chance: chances[k] }
  }
  return tiers
}

export function rollTier(tiers, random) {
  const r = typeof random === 'number' ? random : Math.random()
  let acc = 0
  for (let i = 0; i < TIER_KEYS.length; i++) {
    acc += tiers[TIER_KEYS[i]].chance
    if (r < acc) return TIER_KEYS[i]
  }
  return 'miss'
}