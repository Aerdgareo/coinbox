import { escapeHtml } from './ui.js'

/**
 * 目标达成恭喜弹窗：配色跟随当前主题的 --accent / --accent-2
 */
export function showCongrats(list) {
  if (!list || !list.length) return
  const old = document.getElementById('congrats')
  if (old && old.parentNode) old.parentNode.removeChild(old)

  let goalOne = null
  const childOnes = []
  for (let i = 0; i < list.length; i++) {
    if (list[i].type === 'goal') goalOne = list[i]
    else childOnes.push(list[i])
  }

  const names = list
    .map(function (a) {
      return a.name
    })
    .join('、')
  const title = goalOne ? '大目标达成！' : '小目标达成！'
  const desc = goalOne ? '你攒够了，去把它带回家吧' : '又完成一个，继续保持'

  const el = document.createElement('div')
  el.id = 'congrats'
  el.className = 'congrats'
  el.innerHTML =
    '<div class="congrats-card">' +
    '<div class="congrats-rings" aria-hidden="true"></div>' +
    '<div class="congrats-emoji">🎉</div>' +
    '<div class="congrats-title">' + title + '</div>' +
    '<div class="congrats-name">' + escapeHtml(names) + '</div>' +
    '<div class="congrats-desc">' + desc + '</div>' +
    '<button class="congrats-btn">太棒了</button>' +
    '</div>'
  document.body.appendChild(el)

  function close() {
    el.classList.add('out')
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el)
    }, 280)
  }

  el.querySelector('.congrats-btn').addEventListener('click', close)
  el.addEventListener('click', function (e) {
    if (e.target === el) close()
  })
}