const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-ui2'))

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

  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(600)
  await shot('50-box-bow.png')
  await js('(function(){var b=document.querySelector("#overlay .sheet-close");if(b)b.click();})()')
  await sleep(400)

  await js('document.querySelector("[data-edit-goal]").click()')
  await sleep(500)
  await js('document.querySelector("#child-add").click()')
  await sleep(300)
  await js(
    '(function(){' +
      'function setV(sel,v){var e=document.querySelector(sel);e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}' +
      'setV("[data-idx=\\"0\\"] [data-cname]","内存条");' +
      'setV("[data-idx=\\"0\\"] [data-ctarget]","600");' +
      'setV("[data-idx=\\"0\\"] [data-cpriority]","1");' +
      '})()'
  )
  await sleep(300)
  await shot('51-child-labels.png')
  await js('document.querySelector("#g-submit").click()')
  await sleep(500)

  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(700)
  await shot('52-settings-groups.png')
  const groups = await js('(function(){return Array.from(document.querySelectorAll(".theme-group-head")).map(function(h){return h.innerText.replace(/\\n/g," ")});})()')
  console.log('GROUPS', JSON.stringify(groups))
  await js('document.querySelectorAll(".theme-group-head")[0].click()')
  await sleep(500)
  await shot('53-settings-group-open.png')

  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(500)
  await js('document.getElementById("hideUiBtn").click()')
  await sleep(700)
  await shot('54-hide-ui.png')
  const hidden = await js('document.body.classList.contains("hide-ui")')
  console.log('hide-ui:', hidden)
  await js('document.getElementById("hideUiBtn").click()')
  await sleep(400)

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})