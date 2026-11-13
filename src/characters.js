/**
 * 主题人物
 * 素材主题直接使用 public/characters 下的立绘；
 * 没有素材的主题回退到原创 SVG 风格化形象。
 */

const THEME_IMAGES = {
  congyu: 'congyu',
  congyu2: 'congyu2',
  miku: 'miku',
  gancheng: 'gancheng',
  gancheng2: 'gancheng2'
}

export function characterImage(theme) {
  const name = THEME_IMAGES[theme]
  return name ? './characters/' + name + '.webp' : ''
}

const EYE = (cx, c1, c2) =>
  '<ellipse cx="' + cx + '" cy="114" rx="9.5" ry="11" fill="#fff"/>' +
  '<ellipse cx="' + cx + '" cy="114" rx="8" ry="10" fill="' + c1 + '"/>' +
  '<ellipse cx="' + cx + '" cy="116" rx="5.4" ry="6.8" fill="' + c2 + '"/>' +
  '<circle cx="' + (cx - 3) + '" cy="109" r="3.2" fill="#fff"/>' +
  '<circle cx="' + (cx + 4) + '" cy="120" r="1.5" fill="#fff" opacity="0.85"/>'

const NOSE = '<path d="M100 122 q2 3 0 4" fill="none" stroke="#d9a89c" stroke-width="1.6" stroke-linecap="round"/>'
const MOUTH = '<path d="M95 134 q5 5 10 0" fill="none" stroke="#c98b86" stroke-width="2" stroke-linecap="round"/>'
const BLUSH =
  '<ellipse cx="68" cy="129" rx="8" ry="4.2" fill="#ffb9c9" opacity="0.5"/>' +
  '<ellipse cx="132" cy="129" rx="8" ry="4.2" fill="#ffb9c9" opacity="0.5"/>'

const FUTABA =
  '<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<defs>' +
  '<linearGradient id="fbHair" x1="0" y1="0" x2="0.2" y2="1">' +
  '<stop offset="0" stop-color="#9fbcff"/><stop offset="0.5" stop-color="#5d86f0"/><stop offset="1" stop-color="#3450b8"/>' +
  '</linearGradient>' +
  '</defs>' +
  '<path d="M56 98 a44 44 0 0 1 88 0" fill="none" stroke="#171c2c" stroke-width="8" stroke-linecap="round"/>' +
  '<rect x="44" y="94" width="17" height="36" rx="8" fill="#171c2c"/>' +
  '<rect x="139" y="94" width="17" height="36" rx="8" fill="#171c2c"/>' +
  '<circle cx="52" cy="112" r="4" fill="#5d86f0"/>' +
  '<circle cx="148" cy="112" r="4" fill="#5d86f0"/>' +
  '<path d="M38 240 Q44 186 74 170 L126 170 Q156 186 162 240 Z" fill="#191d2b"/>' +
  '<path d="M76 170 Q100 200 124 170" stroke="#3f63c9" stroke-width="6" fill="none"/>' +
  '<path d="M100 172 L90 200 L110 200 Z" fill="#2d4fae"/>' +
  '<path d="M88 158 h24 v16 h-24 z" fill="#f7dccd"/>' +
  '<path d="M52 108 Q48 42 100 36 Q152 42 148 108 L150 172 Q122 158 100 158 Q78 158 50 172 Z" fill="url(#fbHair)"/>' +
  '<ellipse cx="100" cy="104" rx="39" ry="43" fill="#fdeee6"/>' +
  '<path d="M58 92 Q58 52 100 48 Q142 52 142 92 Q132 70 112 74 Q106 62 96 72 Q80 70 58 92 Z" fill="url(#fbHair)"/>' +
  '<ellipse cx="152" cy="150" rx="20" ry="54" fill="url(#fbHair)" transform="rotate(-10 152 150)"/>' +
  EYE(82, '#7fa6ff', '#3358c4') +
  EYE(118, '#7fa6ff', '#3358c4') +
  BLUSH +
  NOSE +
  MOUTH +
  '<g transform="translate(139 78)">' +
  '<path d="M-7 4 L-2 -7 L3 4 L8 -4" fill="none" stroke="#8fb6ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</g>' +
  '</svg>'

const CHARACTERS = {
  futaba: FUTABA
}

export function characterSvg(theme) {
  return CHARACTERS[theme] || ''
}