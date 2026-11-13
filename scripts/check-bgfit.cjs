const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-fit'))

function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms)
  })
}

async function main() {
  const win = new BrowserWindow({
    width: 460,
    height: 920,
    show: true,
    backgroundColor: '#0b0d18',
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  })
  const js = (c) => win.webContents.executeJavaScript(c)
  async function shot(n) {
    const img = await win.webContents.capturePage()
    fs.writeFileSync(path.join(OUT, n), img.toPNG())
    console.log('shot', n)
  }
  const openSheet = async function () {
    await js('document.getElementById("bgFitBtn").click()')
    await sleep(500)
  }
  const closeSheet = async function () {
    await js('document.querySelector("[data-sheet-close]").click()')
    await sleep(450)
  }

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1400)

  // 1) 礼盒蝴蝶结
  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(700)
  await shot('80-box-bow.png')
  await closeSheet()

  // 2) 切到立绘主题
  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(500)
  await js('document.querySelectorAll(".theme-group-head")[0].click()')
  await sleep(450)
  await js('document.querySelector(\'[data-theme-id="photo-congyu-01"]\').click()')
  await sleep(900)
  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(700)

  // 3) 面板
  await openSheet()
  await shot('81-bgfit-sheet.png')

  // 4) 逐个模式：选完关面板拍整页
  const modes = [
    ['contain', '82-fit-contain.png'],
    ['tile', '83-fit-tile.png'],
    ['blur', '84-fit-blur.png'],
    ['stretch', '85-fit-stretch.png'],
    ['cover', '86-fit-cover.png']
  ]
  for (let i = 0; i < modes.length; i++) {
    await js('document.querySelector(\'[data-fit="' + modes[i][0] + '"]\').click()')
    await sleep(600)
    await closeSheet()
    await shot(modes[i][1])
    const cls = await js('document.getElementById("bgBase").className')
    const fill = await js('document.getElementById("bgFill").className')
    console.log('MODE', modes[i][0], '| base:', cls, '| fill:', fill || '(none)')
    if (i < modes.length - 1) await openSheet()
  }

  // 5) 设置页入口
  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(700)
  await shot('87-bgfit-settings.png')

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})
