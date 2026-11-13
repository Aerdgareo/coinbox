const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-newbg'))

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
  await sleep(600)
  const heads = await js(
    '(function(){return Array.prototype.map.call(document.querySelectorAll(".theme-group-head"),function(h){return h.innerText.replace(/\\s+/g," ");});})()'
  )
  console.log('GROUPS', JSON.stringify(heads, null, 0))

  // 展开 MISSILE228
  const gname = process.argv[2] || 'MISSILE228'
  const tid = process.argv[3] || 'photo-missile-03'
  await js(
    '(function(){var g=' + JSON.stringify(gname) + ';var hs=document.querySelectorAll(".theme-group-head");for(var i=0;i<hs.length;i++){if(hs[i].innerText.indexOf(g)>=0){hs[i].click();hs[i].scrollIntoView({block:"center"});return i;}}return -1;})()'
  )
  await sleep(600)
  await shot('80-groups.png')

  const picked = await js(
    '(function(){var c=document.querySelector(\'[data-theme-id="' + tid + '"]\');if(!c)return "no-card";c.click();return c.getAttribute("data-theme-id");})()'
  )
  console.log('PICK', picked)
  await sleep(900)
  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(1200)
  await shot('81-missile03.png')

  const bg = await js('(function(){var b=document.getElementById("bgBase");return b.style.backgroundImage.slice(0,110);})()')
  console.log('BG', bg)

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})
