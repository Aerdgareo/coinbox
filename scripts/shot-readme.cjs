const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'docs', 'img')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-readme'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const HOUR = 3600 * 1000
const now = Date.now()

const demo = {
  v: 2,
  activeGoal: 'g1',
  goals: [
    {
      id: 'g1',
      name: '新显卡',
      emoji: '🖥',
      target: 4999,
      saved: 2318,
      ownSaved: 0,
      children: [
        { id: 'c1', name: '电源 850W', target: 599, saved: 599, priority: 1, doneAt: now - 6 * HOUR },
        { id: 'c2', name: '内存 32G', target: 899, saved: 899, priority: 2, doneAt: now - 3 * HOUR },
        { id: 'c3', name: '显卡本体', target: 3501, saved: 820, priority: 3, doneAt: null }
      ],
      createdAt: now - 12 * HOUR,
      doneAt: null
    }
  ],
  settings: {
    theme: 'miku',
    accent: '#7fd6ff',
    bgTint: '#0b0d18',
    bgMode: 'theme',
    bgFit: 'cover',
    bgColor: '#0b0d18',
    bgGradient: ['#0b0d18', '#232a52'],
    photoTint: 'auto',
    photoAccent: '#e8b45c',
    particles: true,
    dailyDraws: 1,
    drawMin: 1,
    drawMax: 100,
    sound: false,
    reduceMotion: false
  },
  draw: { date: '', used: 0, tiers: null },
  history: [
    { ts: now - 30 * 60 * 1000, amount: 27, kind: 't5', goalName: '新显卡' },
    { ts: now - 26 * HOUR, amount: 0, kind: 'miss', goalName: '新显卡' },
    { ts: now - 50 * HOUR, amount: 14, kind: 't4', goalName: '新显卡' },
    { ts: now - 74 * HOUR, amount: 3.5, kind: 't3', goalName: '新显卡' },
    { ts: now - 98 * HOUR, amount: 7, kind: 't3', goalName: '新显卡' },
    { ts: now - 122 * HOUR, amount: 52, kind: 't7', goalName: '新显卡' },
    { ts: now - 146 * HOUR, amount: 2, kind: 't2', goalName: '新显卡' },
    { ts: now - 170 * HOUR, amount: 1, kind: 't1', goalName: '新显卡' },
    { ts: now - 194 * HOUR, amount: 0, kind: 'miss', goalName: '新显卡' }
  ]
}

async function main() {
  const win = new BrowserWindow({
    width: 560,
    height: 950,
    show: true,
    backgroundColor: '#0b0d18',
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  })
  const js = (c) => win.webContents.executeJavaScript(c)
  win.webContents.debugger.attach('1.3')
  // 用 CDP 超视口截图：2 倍像素密度，绕过屏幕高度限制
  async function shot(name) {
    const dims = JSON.parse(
      await js('JSON.stringify({w:document.documentElement.clientWidth,h:window.innerHeight})')
    )
    const res = await win.webContents.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: dims.w, height: dims.h, scale: 2 }
    })
    const buf = Buffer.from(res.data, 'base64')
    fs.writeFileSync(path.join(OUT, name), buf)
    console.log('shot', name, dims.w + 'x' + dims.h)
  }

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1200)
  await js('localStorage.setItem("coinbox.state.v2", ' + JSON.stringify(JSON.stringify(demo)) + ')')
  await win.webContents.reload()
  await sleep(1600)

  await shot('01-home.png')

  // 抽奖页
  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(1100)
  await shot('02-draw.png')

  // 关闭抽奖弹层 → 记录
  await js('(function(){var b=document.querySelector("[data-sheet-close]"); if(b){b.click();return "closed";} return "none";})()')
  await sleep(700)
  await js('document.querySelector(\'[data-tab="history"]\').click()')
  await sleep(900)
  await shot('03-history.png')

  // 设置页（配色主题区）
  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(1000)
  await shot('04-themes.png')

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e && e.message)
  app.quit()
})
