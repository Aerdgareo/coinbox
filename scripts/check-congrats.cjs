const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-features'))

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
  await sleep(1500)

  await js('document.querySelector("[data-add-saving]").click()')
  await sleep(500)
  await js(
    '(function(){' +
      'var i=document.querySelector("#save-amount");i.value="100";i.dispatchEvent(new Event("input",{bubbles:true}));' +
      'document.querySelector("[data-save-confirm]").click();' +
      '})()'
  )
  await sleep(1000)
  await shot('46-congrats.png')
  const c = await js('(function(){var e=document.getElementById("congrats");return e?e.innerText:""})()')
  console.log('CONGRATS', JSON.stringify(c))

  const name = await js('(function(){var f=document.querySelector(".congrats-card");return f?getComputedStyle(f).backgroundImage:""})()')
  console.log('BG', name)

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})