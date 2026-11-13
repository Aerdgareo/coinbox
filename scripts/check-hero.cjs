const { app, BrowserWindow } = require('electron')
const path = require('path')

app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-herocheck'))

function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms)
  })
}

async function main() {
  const win = new BrowserWindow({
    width: 460,
    height: 920,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  })
  win.webContents.on('console-message', function (e, l, m) {
    if (l >= 2) console.log('[console]', m)
  })
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1200)

  const themes = ['congyu', 'congyu2', 'miku', 'gancheng', 'gancheng2', 'futaba', 'default']
  for (let i = 0; i < themes.length; i++) {
    const t = themes[i]
    await win.webContents.executeJavaScript(
      'document.querySelector(\'[data-tab="settings"]\').click();' +
        'var c=document.querySelector(\'[data-theme-id="' + t + '"]\'); if(c) c.click();' +
        'document.querySelector(\'[data-tab="home"]\').click();'
    )
    await sleep(600)
    const info = await win.webContents.executeJavaScript(
      '(function(){' +
        'var im=document.querySelector(".hero-char img");' +
        'var sv=document.querySelector(".hero-char svg");' +
        'return {hero:!!document.querySelector(".hero-char"), img:!!im, src:im?im.getAttribute("src"):"", nw:im?im.naturalWidth:0, nh:im?im.naturalHeight:0, svg:!!sv};' +
        '})()'
    )
    console.log(t, JSON.stringify(info))
  }

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})