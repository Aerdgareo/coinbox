const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-photo'))

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
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1500)

  await win.webContents.executeJavaScript('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(600)

  const pending = await win.webContents.executeJavaScript(
    '(function(){var p=document.querySelector(".theme-card.pending");' +
      'return {found:!!p, text:p?p.innerText:"", h:p?p.offsetHeight:0, w:p?p.offsetWidth:0};})()'
  )
  console.log('PENDING', JSON.stringify(pending))

  const photos = ['photo-congyu', 'photo-miku', 'photo-gancheng', 'photo-gancheng2']
  for (let i = 0; i < photos.length; i++) {
    const id = photos[i]
    await win.webContents.executeJavaScript(
      'var c=document.querySelector(\'[data-theme-id="' + id + '"]\'); if(c) c.click();'
    )
    await sleep(700)
    await win.webContents.executeJavaScript('document.querySelector(\'[data-tab="home"]\').click()')
    await sleep(900)
    const bg = await win.webContents.executeJavaScript(
      '(function(){var b=document.getElementById("bgBase");return {img:b.style.backgroundImage.slice(0,120), has:b.className};})()'
    )
    const img = await win.webContents.capturePage()
    fs.writeFileSync(path.join(OUT, '2' + i + '-home-' + id + '.png'), img.toPNG())
    console.log(id, JSON.stringify(bg))
    await win.webContents.executeJavaScript('document.querySelector(\'[data-tab="settings"]\').click()')
    await sleep(400)
  }

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})