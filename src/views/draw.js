import { getState, activeGoal, drawRemaining, performDraw, money } from '../state.js'
import { fmtMoney, fmtPct, openSheet, closeSheet, toast, escapeHtml } from '../ui.js'
import { TIER_KEYS, TIER_LABEL } from '../draw.js'
import { showCongrats } from '../congrats.js'

let audioCtx = null

function soundOn() {
  const s = getState().settings
  return s.sound !== false
}

function tone(freq, start, dur, vol, type) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    if (!audioCtx) audioCtx = new AC()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const t0 = audioCtx.currentTime + start
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type || 'sine'
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(vol || 0.09, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  } catch (e) {}
}

function playOpen() {
  if (!soundOn()) return
  tone(420, 0, 0.16, 0.07, 'triangle')
  tone(640, 0.12, 0.2, 0.06, 'triangle')
}

function playWin(kind) {
  if (!soundOn()) return
  if (kind === 'big') {
    tone(660, 0, 0.16, 0.09)
    tone(880, 0.12, 0.18, 0.09)
    tone(1320, 0.26, 0.32, 0.08)
  } else if (kind === 'mid') {
    tone(620, 0, 0.16, 0.08)
    tone(930, 0.13, 0.24, 0.07)
  } else if (kind === 'small' || kind === 'miss') {
    tone(700, 0, 0.2, 0.07)
  } else {
    tone(300, 0, 0.22, 0.05, 'sine')
    tone(220, 0.14, 0.24, 0.04, 'sine')
  }
}

function tierRow(tiers) {
  return (
    '<div class="tiers">' +
    TIER_KEYS.map(function (k) {
      return tierCell(TIER_LABEL[k], tiers[k])
    }).join('') +
    '</div>'
  )
}

function tierCell(label, tier) {
  return (
    '<div class="tier">' +
    '<div class="t-amount">¥' + fmtMoney(tier.amount) + '</div>' +
    '<div class="t-pct">' + fmtPct(tier.chance) + ' 概率</div>' +
    '<div class="t-tag">' + label + '</div>' +
    '</div>'
  )
}

export function openDraw() {
  const state = getState()
  const remain = drawRemaining()
  if (remain <= 0) {
    toast('今天的次数用完啦，明天 0 点刷新')
    return
  }

  const tiers = state.draw.tiers
  const goal = activeGoal()

  const sheet = openSheet(
    '<div class="gacha">' +
    '<div class="gacha-stage" id="gacha-stage">' +
    '<div class="gacha-glow"></div>' +
    '<div class="beam"></div>' +
    '<div class="box" id="gacha-box">' +
    '<div class="box-body"></div>' +
    '<div class="box-shine"></div>' +
    '<div class="box-lid"><span class="bow"><i></i></span></div>' +
    '</div>' +
    '</div>' +
    '<div class="tiny faint">点一下盒子，看看今天的手气</div>' +
    '</div>' +
    '<div class="mt-16" style="font-size:12px;color:var(--text-dim);margin-bottom:8px">今日奖池 · 目标「' +
    escapeHtml(goal.name) + '」</div>' +
    tierRow(tiers) +
    '<div class="faint tiny mt-8" style="line-height:1.6">' +
    '越大的奖越难抽；目标攒得越多，大奖概率也会再降一点。<br>' +
    '没抽中档位也有 ¥0.1 安慰奖，不会空手。<br>' +
    '今日还剩 ' + remain + ' / ' + state.settings.dailyDraws + ' 次。' +
    '</div>' +
    '<button class="btn btn-primary btn-block mt-16" id="gacha-go">开 启 盲 盒</button>',
    { title: '今日盲盒' }
  )
  if (!sheet) return

  const stage = sheet.querySelector('#gacha-stage')
  const box = sheet.querySelector('#gacha-box')
  const go = sheet.querySelector('#gacha-go')
  let locked = false

  function start() {
    if (locked) return
    if (drawRemaining() <= 0) {
      toast('今天的次数用完啦')
      closeSheet()
      return
    }
    locked = true
    go.disabled = true
    go.textContent = '开启中…'

    const res = performDraw()
    if (!res.ok) {
      locked = false
      go.disabled = false
      go.textContent = '开 启 盲 盒'
      toast('今天的次数用完啦')
      return
    }

    playOpen()
    stage.classList.add('is-opening')
    if (res.kind === 'miss') stage.classList.add('is-miss')

    setTimeout(function () {
      playWin(res.kind)
      showResult(sheet, res, tiers)
    }, 1050)
  }

  box.addEventListener('click', start)
  go.addEventListener('click', start)
}

function showResult(sheet, res, tiers) {
  const goal = activeGoal()
  const pct = Math.min(100, (goal.saved / goal.target) * 100)
  const fill = pct > 0 && pct < 1.5 ? 1.5 : pct
  const rest = Math.max(0, goal.target - goal.saved)
  const label = TIER_LABEL[res.kind] || '开箱结果'
  const value = '+¥' + fmtMoney(res.amount)
  const achievements = res.achievements || []

  let achHtml = ''
  if (achievements.length) {
    const names = achievements
      .map(function (a) {
        return escapeHtml(a.name)
      })
      .join('、')
    achHtml = '<div class="achievement-tag">🎉 ' + names + ' 达成</div>'
  }

  sheet.innerHTML =
    '<div class="sheet-handle"></div>' +
    '<div class="sheet-head"><div class="sheet-title">开箱结果</div>' +
    '<button class="sheet-close" data-sheet-close>✕</button></div>' +
    '<div class="result">' +
    '<div class="result-label">' + label + '</div>' +
    '<div class="result-value' + (res.amount < 1 ? ' zero' : '') + '">' + value + '</div>' +
    '<div class="result-note">' +
    '已加进「' + escapeHtml(goal.name) + '」' + (rest > 0 ? ' · 还差 ¥' + fmtMoney(rest) : ' · 已经达成啦') +
    '</div>' +
    achHtml +
    '</div>' +
    '<div class="card card-tight mt-16" style="margin-bottom:0">' +
    '<div class="goal-meta" style="margin-top:0"><span>当前进度</span>' +
    '<span class="goal-pct">' + pct.toFixed(pct >= 10 ? 0 : 1) + '%</span></div>' +
    '<div class="progress thin mt-8"><div class="progress-fill" style="width:' + fill.toFixed(2) + '%"></div></div>' +
    '<div class="tiny faint mt-8">¥' + fmtMoney(goal.saved) + ' / ¥' + fmtMoney(goal.target) + '</div>' +
    '</div>' +
    (res.remaining > 0
      ? '<button class="btn btn-primary btn-block mt-16" id="gacha-again">再开一次（还剩 ' + res.remaining + ' 次）</button>'
      : achievements.length
        ? '<button class="btn btn-primary btn-block mt-16" id="result-done">收下 · 看看成果</button>'
        : '<button class="btn btn-primary btn-block mt-16" data-sheet-close>收下，明天再来</button>')

  const closers = sheet.querySelectorAll('[data-sheet-close]')
  for (let i = 0; i < closers.length; i++) {
    closers[i].addEventListener('click', function () {
      closeSheet()
      if (achievements.length) {
        setTimeout(function () {
          showCongrats(achievements)
        }, 200)
      }
    })
  }

  const done = sheet.querySelector('#result-done')
  if (done) {
    done.addEventListener('click', function () {
      closeSheet()
      setTimeout(function () {
        showCongrats(achievements)
      }, 200)
    })
  }

  const again = sheet.querySelector('#gacha-again')
  if (again) {
    again.addEventListener('click', function () {
      closeSheet()
      if (achievements.length) {
        setTimeout(function () {
          showCongrats(achievements)
        }, 200)
      } else {
        setTimeout(openDraw, 120)
      }
    })
  }
}