const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-btn'))

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

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1500)

  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(500)
  await js('document.querySelectorAll(".theme-group-head")[0].click()')
  await sleep(400)
  await js('document.querySelector(\'[data-theme-id="photo-congyu-01"]\').click()')
  await sleep(700)
  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(700)

  const info = await js(
    '(function(){var b=document.querySelector("[data-open-draw]");var cs=getComputedStyle(b);' +
      'return {bg:cs.backgroundImage,color:cs.color,theme:document.body.getAttribute("data-theme")};})()'
  )
  console.log('BUTTON', JSON.stringify(info))

  const img = await win.webContents.capturePage()
  fs.writeFileSync(path.join(__dirname, '..', 'screenshots', '60-btn-fixed.png'), img.toPNG())
  console.log('shot 60-btn-fixed.png')

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})