/**
 * 抽奖规则引擎（纯函数，不碰 DOM）
 *
 * 规则：
 * 1. 每天的奖池从「设置里的金额范围」中生成 8 个档位；
 * 2. 金额越大，中奖概率越小；
 * 3. 目标攒得越多（进度越高），大额档概率进一步下降；
 * 4. 默认范围 1~100 元，可在设置里调整；
 * 5. 同一天同一目标结果恒定（按 日期+目标ID 播种），跨日刷新。
 */

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

export function round1(n) {
  return Math.round(n * 10) / 10
}

export function roundAmount(n) {
  if (n < 1) return Math.max(0.1, Math.round(n * 10) / 10)
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
  miss: '再接再厉'
}

const WEIGHTS = [20, 17, 14, 12, 9, 7, 5, 4]

function buildChances(progress, rnd) {
  const w = []
  for (let i = 0; i < WEIGHTS.length; i++) {
    let base = WEIGHTS[i] * (1 + (rnd() - 0.5) * 0.14)
    if (i >= 4) base *= 1 - progress * 0.35
    w.push(Math.max(0.4, base))
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

  const seed = hashStr((goal ? goal.id : 'x') + '@' + dateStr + '|' + min + '-' + max)
  const rnd = mulberry32(seed)

  const ratio = max / min
  const amounts = []
  for (let i = 0; i < TIER_KEYS.length; i++) {
    amounts.push(roundAmount(min * Math.pow(ratio, i / (TIER_KEYS.length - 1))))
  }

  const chances = buildChances(progress, rnd)

  const tiers = {
    date: dateStr,
    progress: Math.round(progress * 1000) / 1000,
    min: min,
    max: max,
    miss: { amount: 0, chance: chances.miss }
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