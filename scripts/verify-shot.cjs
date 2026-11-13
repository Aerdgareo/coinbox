const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots')
const USER_DATA = path.join(ROOT, '.tmp-userdata')

app.disableHardwareAcceleration()
app.setPath('userData', USER_DATA)

function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms)
  })
}

async function shot(win, name) {
  const img = await win.webContents.capturePage()
  fs.writeFileSync(path.join(OUT, name), img.toPNG())
  console.log('shot', name)
}

async function click(win, selector) {
  return win.webContents.executeJavaScript(
    'document.querySelector(' + JSON.stringify(selector) + ').click()'
  )
}

async function waitFor(win, expr, timeout) {
  const t0 = Date.now()
  while (Date.now() - t0 < (timeout || 6000)) {
    const ok = await win.webContents.executeJavaScript(expr)
    if (ok) return true
    await sleep(150)
  }
  return false
}

async function main() {
  if (fs.existsSync(USER_DATA)) fs.rmSync(USER_DATA, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  const win = new BrowserWindow({
    width: 460,
    height: 920,
    show: true,
    backgroundColor: '#0b0d18',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  })

  win.webContents.on('console-message', function (e, level, msg) {
    if (level >= 2) console.log('[console:' + level + ']', msg)
  })

  await win.loadFile(path.join(ROOT, 'dist', 'index.html'))
  await sleep(2000)
  await shot(win, '01-home-default.png')

  await click(win, '[data-open-draw]')
  await sleep(500)
  await shot(win, '02-draw-box.png')

  await click(win, '#gacha-go')
  const resultOk = await waitFor(
    win,
    '(function(){var o=document.getElementById("overlay");return !!(o&&o.innerText.indexOf("开箱结果")>=0)})()',
    8000
  )
  console.log('result shown:', resultOk)
  await sleep(600)
  await shot(win, '03-draw-result.png')

  await win.webContents.executeJavaScript(
    'var b=document.querySelector("#overlay .sheet-close"); if(b) b.click();'
  )
  await sleep(400)

  await click(win, '[data-tab="history"]')
  await sleep(500)
  await shot(win, '04-history.png')

  await click(win, '[data-tab="settings"]')
  await sleep(500)
  await shot(win, '05-settings.png')

  await click(win, '[data-theme-id="congyu"]')
  await sleep(900)
  await shot(win, '06-settings-congyu.png')

  await click(win, '[data-tab="home"]')
  await sleep(800)
  await shot(win, '07-home-congyu.png')

  await click(win, '[data-tab="settings"]')
  await sleep(400)
  await click(win, '[data-theme-id="miku"]')
  await sleep(800)
  await click(win, '[data-tab="home"]')
  await sleep(800)
  await shot(win, '08-home-miku.png')

  await click(win, '[data-tab="settings"]')
  await sleep(400)
  await click(win, '[data-theme-id="gancheng"]')
  await sleep(800)
  await click(win, '[data-tab="home"]')
  await sleep(800)
  await shot(win, '09-home-gancheng.png')

  await click(win, '[data-tab="settings"]')
  await sleep(400)
  await click(win, '[data-theme-id="futaba"]')
  await sleep(800)
  await click(win, '[data-tab="home"]')
  await sleep(800)
  await shot(win, '10-home-futaba.png')

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAILED', e)
  app.quit()
})