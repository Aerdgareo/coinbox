import { getState, updateSettings } from '../state.js'
import { openSheet } from '../ui.js'

// 背景显示方式：决定立绘 / 自定义图片在屏幕上怎么铺
export const BG_FIT_OPTIONS = [
  { id: 'cover', name: '铺满裁切', desc: '填满整屏，多出来的边缘被裁掉，画面最饱满', cls: 't-cover' },
  { id: 'contain', name: '完整显示', desc: '整张图都看得到，留白处用同图模糊垫底', cls: 't-contain' },
  { id: 'blur', name: '模糊铺满', desc: '背景虚化铺满，前景文字更清楚', cls: 't-blur' },
  { id: 'tile', name: '平铺重复', desc: '图片缩小后重复排列，像壁纸纹理', cls: 't-tile' },
  { id: 'stretch', name: '拉伸铺满', desc: '强行拉满整屏，比例不对时会变形', cls: 't-stretch' }
]

export function fitName(id) {
  for (let i = 0; i < BG_FIT_OPTIONS.length; i++) {
    if (BG_FIT_OPTIONS[i].id === id) return BG_FIT_OPTIONS[i].name
  }
  return BG_FIT_OPTIONS[0].name
}

function hasImageBg(s) {
  return s.bgMode === 'image' || (s.bgMode === 'theme' && s.theme !== 'default')
}

function optionsHtml(cur) {
  let html = ''
  for (let i = 0; i < BG_FIT_OPTIONS.length; i++) {
    const o = BG_FIT_OPTIONS[i]
    html +=
      '<button class="fit-opt' + (o.id === cur ? ' active' : '') + '" data-fit="' + o.id + '">' +
      '<span class="fo-ico ' + o.cls + '"><i></i></span>' +
      '<span class="fo-txt">' +
      '<span class="fo-name">' + o.name + '</span>' +
      '<span class="fo-desc">' + o.desc + '</span>' +
      '</span>' +
      '<span class="fo-check"></span>' +
      '</button>'
  }
  return html
}

function hintText(s) {
  if (hasImageBg(s)) return '当前背景：' + fitName(s.bgFit) + '，点一下立即生效。'
  return '当前是纯色 / 渐变背景，这些选项会在立绘背景或自定义图片时生效。'
}

export function openBgFitSheet() {
  const state = getState()
  const s = state.settings
  const sheet = openSheet(
    '<div class="faint tiny" style="line-height:1.6;margin-bottom:12px">选一种铺法，看看哪种最舒服。设置会记住。</div>' +
    '<div class="fit-list" id="fit-list">' + optionsHtml(s.bgFit) + '</div>' +
    '<div class="faint tiny mt-12" id="fit-hint">' + hintText(s) + '</div>',
    { title: '背景显示方式' }
  )
  if (!sheet) return

  const list = sheet.querySelector('#fit-list')
  const hint = sheet.querySelector('#fit-hint')

  list.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-fit]')
    if (!btn) return
    const id = btn.getAttribute('data-fit')
    if (id === getState().settings.bgFit) return
    updateSettings({ bgFit: id })
    const all = list.querySelectorAll('[data-fit]')
    for (let i = 0; i < all.length; i++) {
      const on = all[i].getAttribute('data-fit') === id
      if (on) all[i].classList.add('active')
      else all[i].classList.remove('active')
    }
    if (hint) hint.textContent = hintText(getState().settings)
  })
}
