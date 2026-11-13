import { getState } from '../state.js'
import { fmtMoney, fmtTime, escapeHtml } from '../ui.js'
import { TIER_LABEL } from '../draw.js'

export function renderHistory(el) {
  const state = getState()
  const history = state.history

  const totalDraws = history.length
  const wins = history.filter(function (h) { return h.amount > 0 })
  const totalWon = wins.reduce(function (s, h) { return s + h.amount }, 0)
  const best = history.reduce(function (m, h) { return Math.max(m, h.amount) }, 0)
  const winRate = totalDraws ? (wins.length / totalDraws) * 100 : 0

  let listHtml = ''
  if (history.length === 0) {
    listHtml =
      '<div class="empty"><div class="e-ico">🎁</div>' +
      '<div class="e-text">还没有抽奖记录<br>去首页开今天的第一个盲盒吧</div></div>'
  } else {
    listHtml = '<div class="card card-tight">'
    for (let i = 0; i < history.length; i++) {
      const h = history[i]
      const win = h.amount > 0
      listHtml +=
        '<div class="row">' +
        '<div class="row-main">' +
        '<div class="row-icon">' + (win ? '🎁' : '·') + '</div>' +
        '<div class="row-text">' +
        '<div class="row-title">' + escapeHtml(h.goalName || '目标') + '</div>' +
        '<div class="row-sub">' + fmtTime(h.ts) + ' · ' + (win ? (TIER_LABEL[h.kind] || '抽奖') : '未中') + '</div>' +
        '</div></div>' +
        '<div class="row-value ' + (win ? 'plus' : 'mute') + '">' +
        (win ? '+¥' + fmtMoney(h.amount) : '未中') +
        '</div></div>'
    }
    listHtml += '</div>'
  }

  el.innerHTML =
    '<div class="stat-grid" style="margin-bottom:6px">' +
    stat('累计抽奖', totalDraws, '次') +
    stat('累计抽到', totalWon, '元') +
    stat('中奖率', winRate.toFixed(0), '%') +
    stat('单次最高', best, '元') +
    '</div>' +
    '<div class="card-title" style="padding:10px 4px 8px"><span class="t"><i>🗂</i>抽奖记录</span>' +
    '<span class="faint tiny">最近 ' + Math.min(history.length, 300) + ' 条</span></div>' +
    listHtml
}

function stat(k, v, unit) {
  return (
    '<div class="stat"><div class="stat-inner">' +
    '<div class="stat-k">' + k + '</div>' +
    '<div class="stat-v">' + fmtMoney(v) + '<small>' + unit + '</small></div>' +
    '</div></div>'
  )
}