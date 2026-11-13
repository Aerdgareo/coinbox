const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-bg'))

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

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1500)

  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(500)
  await js('document.querySelectorAll(".theme-group-head")[0].click()')
  await sleep(500)
  await js('document.querySelector(\'[data-theme-id="photo-congyu-01"]\').click()')
  await sleep(800)
  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(800)
  await shot('70-bg-congyu01.png')
  const bg = await js('(function(){var b=document.getElementById("bgBase");return b.style.backgroundImage.slice(0,90);})()')
  console.log('BG', bg)

  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(700)
  await shot('71-box-new.png')

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})