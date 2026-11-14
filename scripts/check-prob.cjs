const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-prob'))

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
  const js = (code) => win.webContents.executeJavaScript(code)
  async function shot(name) {
    const img = await win.webContents.capturePage()
    fs.writeFileSync(path.join(OUT, name), img.toPNG())
    console.log('shot', name)
  }

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1600)
  await shot('84-home-no-progress-bias.png')

  const homeTip = await js('(function(){var e=document.querySelector(".faint.tiny.mt-12");return e?e.innerText:""})()')
  console.log('HOME TIP', JSON.stringify(homeTip))

  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(700)
  await shot('85-draw-sheet.png')
  const sheetTip = await js('(function(){var s=document.querySelector(".sheet");return s?s.innerText:""})()')
  console.log('SHEET TIP', JSON.stringify(sheetTip))

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})
