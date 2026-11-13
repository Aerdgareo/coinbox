/**
 * 通用 UI 工具：Toast / 底部弹层 / 确认框 / 时间格式化
 */

let toastTimer = 0

export function toast(msg, ms) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.classList.add('show')
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(function () {
    el.classList.remove('show')
  }, ms || 1800)
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  })
}

export function fmtMoney(n) {
  const v = Math.round(Number(n || 0) * 100) / 100
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  if (v > 0 && v < 1) return String(v)
  if (v % 1 === 0) return String(v)
  return v.toFixed(2)
}

export function fmtPct(n) {
  return Math.round(Number(n || 0) * 100) + '%'
}

export function fmtTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const same =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  const hh = d.getHours()
  const mm = d.getMinutes()
  const time = (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
  if (same) return '今天 ' + time
  return d.getMonth() + 1 + '月' + d.getDate() + '日 ' + time
}

export function openSheet(innerHtml, opts) {
  const overlay = document.getElementById('overlay')
  if (!overlay) return null
  const o = opts || {}
  overlay.innerHTML =
    '<div class="sheet">' +
    '<div class="sheet-handle"></div>' +
    (o.title
      ? '<div class="sheet-head"><div class="sheet-title">' +
        escapeHtml(o.title) +
        '</div><button class="sheet-close" data-sheet-close>✕</button></div>'
      : '') +
    innerHtml +
    '</div>'
  overlay.hidden = false

  const sheet = overlay.querySelector('.sheet')

  function onBackdrop(e) {
    if (e.target === overlay && o.dismissable !== false) closeSheet()
  }
  function onKey(e) {
    if (e.key === 'Escape') closeSheet()
  }
  overlay.addEventListener('click', onBackdrop)
  document.addEventListener('keydown', onKey)

  const closers = overlay.querySelectorAll('[data-sheet-close]')
  for (let i = 0; i < closers.length; i++) {
    closers[i].addEventListener('click', closeSheet)
  }

  overlay.__cleanup = function () {
    overlay.removeEventListener('click', onBackdrop)
    document.removeEventListener('keydown', onKey)
  }

  if (o.onClose) overlay.__onClose = o.onClose
  return sheet
}

export function closeSheet() {
  const overlay = document.getElementById('overlay')
  if (!overlay) return
  overlay.hidden = true
  overlay.innerHTML = ''
  if (overlay.__cleanup) overlay.__cleanup()
  if (overlay.__onClose) {
    const fn = overlay.__onClose
    overlay.__onClose = null
    fn()
  }
}

export function confirmDialog(title, text, danger) {
  return new Promise(function (resolve) {
    const html =
      '<div class="text-center" style="padding:6px 4px 4px">' +
      '<div style="font-size:14px;line-height:1.7;color:var(--text-dim);margin-bottom:20px">' +
      escapeHtml(text || '') +
      '</div>' +
      '<div style="display:flex">' +
      '<button class="btn btn-ghost" data-confirm-no style="flex:1;margin-right:10px">取消</button>' +
      '<button class="btn btn-primary" data-confirm-yes style="flex:1">确定</button>' +
      '</div></div>'

    const sheet = openSheet(html, {
      title: title,
      dismissable: true,
      onClose: function () {
        resolve(false)
      }
    })
    if (!sheet) return

    const yes = sheet.querySelector('[data-confirm-yes]')
    if (danger) {
      yes.style.background = 'linear-gradient(135deg,#ff6b8a,#ff9d7a)'
      yes.style.boxShadow = '0 10px 26px rgba(255,107,138,.4)'
    }
    yes.addEventListener('click', function () {
      if (sheet.parentNode && sheet.parentNode.__onClose) sheet.parentNode.__onClose = null
      const overlay = document.getElementById('overlay')
      if (overlay) overlay.__onClose = null
      closeSheet()
      resolve(true)
    })
    sheet.querySelector('[data-confirm-no]').addEventListener('click', function () {
      const overlay = document.getElementById('overlay')
      if (overlay) overlay.__onClose = null
      closeSheet()
      resolve(false)
    })
  })
}

export function debounce(fn, wait) {
  let t = 0
  return function () {
    const args = arguments
    const self = this
    clearTimeout(t)
    t = setTimeout(function () {
      fn.apply(self, args)
    }, wait || 200)
  }
}