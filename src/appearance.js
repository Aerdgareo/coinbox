import { getBgImage } from './state.js'
import { getTheme } from './themes.js'
import { setParticles } from './particles.js'

function normHex(hex) {
  let h = String(hex || '#7b6cff').replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (h.length !== 6) h = '7b6cff'
  return h
}

export function hexToRgb(hex) {
  const h = normHex(hex)
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}

export function rgba(hex, a) {
  const c = hexToRgb(hex)
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'
}

export function mix(hex, target, amount) {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  const t = Math.max(0, Math.min(1, amount))
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return '#' + [r, g, bl].map(function (v) {
    const s = v.toString(16)
    return s.length === 1 ? '0' + s : s
  }).join('')
}

export function lighten(hex, amt) {
  return mix(hex, '#ffffff', amt)
}

export function darken(hex, amt) {
  return mix(hex, '#000000', amt)
}

const INLINE_VARS = ['--accent', '--accent-2', '--accent-soft', '--accent-glow', '--bg-1', '--bg-2', '--bg-3']

export function applyAppearance(state) {
  const s = state.settings
  const theme = getTheme(s.theme)
  const body = document.body
  body.setAttribute('data-theme', s.theme)
  if (s.reduceMotion) body.classList.add('reduce-motion')
  else body.classList.remove('reduce-motion')

  const style = body.style
  if (s.theme === 'default') {
    const accent = s.accent || '#7b6cff'
    const tint = s.bgTint || '#0b0d18'
    style.setProperty('--accent', accent)
    style.setProperty('--accent-2', lighten(accent, 0.24))
    style.setProperty('--accent-soft', rgba(accent, 0.16))
    style.setProperty('--accent-glow', rgba(accent, 0.46))
    style.setProperty('--bg-1', tint)
    style.setProperty('--bg-2', lighten(tint, 0.1))
    style.setProperty('--bg-3', darken(tint, 0.16))
  } else if (theme && theme.bgImage) {
    let accent = theme.accent
    let accent2 = theme.accent2
    if (s.photoTint === 'gold') {
      accent = '#e8b45c'
      accent2 = '#ffd98a'
    } else if (s.photoTint === 'custom' && s.photoAccent) {
      accent = s.photoAccent
      accent2 = lighten(accent, 0.22)
    }
    style.setProperty('--accent', accent)
    style.setProperty('--accent-2', accent2)
    style.setProperty('--accent-soft', rgba(accent, 0.16))
    style.setProperty('--accent-glow', rgba(accent, 0.44))
    style.setProperty('--bg-1', '#0a0d14')
    style.setProperty('--bg-2', '#121a22')
    style.setProperty('--bg-3', '#070a10')
  } else {
    for (let i = 0; i < INLINE_VARS.length; i++) style.removeProperty(INLINE_VARS[i])
  }

  applyBackground(s, theme)

  const computed = window.getComputedStyle(body)
  const accent2 = (computed.getPropertyValue('--accent-2') || '#a78bfa').trim()
  setParticles({
    enabled: s.particles !== false && !s.reduceMotion,
    theme: s.theme,
    color: accent2
  })
}

const FIT_CLASSES = ['fit-cover', 'fit-contain', 'fit-tile', 'fit-stretch', 'fit-blur']

function applyFit(bg, fill, fit) {
  const mode = fit || 'cover'
  for (let i = 0; i < FIT_CLASSES.length; i++) {
    const on = FIT_CLASSES[i] === 'fit-' + mode
    if (on) bg.classList.add(FIT_CLASSES[i])
    else bg.classList.remove(FIT_CLASSES[i])
  }
  // 完整显示 / 平铺时会留白，用同一张图的模糊副本垫底，避免出现黑边
  if (fill) {
    if (mode === 'contain' || mode === 'tile') fill.classList.add('on')
    else fill.classList.remove('on')
  }
}

export function applyBackground(s, theme) {
  const bg = document.getElementById('bgBase')
  if (!bg) return
  const fill = document.getElementById('bgFill')
  bg.classList.remove('has-image')
  bg.style.backgroundColor = ''
  bg.style.backgroundImage = ''
  if (fill) {
    fill.style.backgroundImage = ''
    fill.classList.remove('on')
  }

  if (s.bgMode === 'image') {
    const img = getBgImage()
    if (img) {
      bg.classList.add('has-image')
      bg.style.backgroundImage =
        'linear-gradient(rgba(6,7,14,0.52),rgba(6,7,14,0.66)),url("' + img + '")'
      bg.style.backgroundColor = '#05060c'
      if (fill) fill.style.backgroundImage = 'url("' + img + '")'
      applyFit(bg, fill, s.bgFit)
      return
    }
  }

  if (s.bgMode === 'theme' && theme && theme.bgImage) {
    bg.classList.add('has-image')
    bg.style.backgroundImage =
      'linear-gradient(180deg,rgba(4,6,12,0.52) 0%,rgba(4,6,12,0.68) 45%,rgba(4,6,12,0.84) 100%),url("' + theme.bgImage + '")'
    bg.style.backgroundColor = '#05060c'
    if (fill) fill.style.backgroundImage = 'url("' + theme.bgImage + '")'
    applyFit(bg, fill, s.bgFit)
    return
  }

  // 纯色 / 渐变背景不涉及铺图方式，清掉残留的缩放与滤镜
  applyFit(bg, fill, s.bgFit)

  if (s.bgMode === 'solid') {
    bg.style.backgroundColor = s.bgColor || '#0b0d18'
    bg.style.backgroundImage = 'none'
    return
  }

  if (s.bgMode === 'gradient') {
    const g = s.bgGradient || ['#0b0d18', '#232a52']
    bg.style.backgroundImage = 'linear-gradient(158deg,' + g[0] + ' 0%,' + g[1] + ' 100%)'
    return
  }
}