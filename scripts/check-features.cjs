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
  async function waitFor(expr, timeout) {
    const t0 = Date.now()
    while (Date.now() - t0 < (timeout || 6000)) {
      if (await js(expr)) return true
      await sleep(150)
    }
    return false
  }

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1600)
  await shot('40-home-8tiers.png')

  // 打开编辑，改目标金额并添加子目标
  await js('document.querySelector("[data-edit-goal]").click()')
  await sleep(500)
  await js(
    '(function(){' +
      'function setV(sel,v){var e=document.querySelector(sel);e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}' +
      'setV("#g-target","10");' +
      'document.querySelector("#child-add").click();' +
      'setV("[data-idx=\\"0\\"] [data-cname]","内存条");' +
      'setV("[data-idx=\\"0\\"] [data-ctarget]","5");' +
      'setV("[data-idx=\\"0\\"] [data-cpriority]","1");' +
      '})()'
  )
  await sleep(400)
  await js('document.querySelector("#g-submit").click()')
  await sleep(600)
  await shot('41-home-with-child.png')

  // 抽奖
  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(600)
  await shot('42-draw-8tiers.png')
  await js('document.querySelector("#gacha-go").click()')
  await waitFor('(function(){var o=document.getElementById("overlay");return !!(o&&o.innerText.indexOf("开箱结果")>=0)})()', 9000)
  await sleep(700)
  await shot('43-result.png')

  const done = await js('!!document.querySelector("#result-done")')
  console.log('has result-done:', done)
  if (done) {
    await js('document.querySelector("#result-done").click()')
    await sleep(900)
    await shot('44-congrats.png')
    const c = await js('(function(){var e=document.getElementById("congrats");return e?e.innerText:""})()')
    console.log('CONGRATS', JSON.stringify(c))
    await js('(function(){var b=document.querySelector(".congrats-btn");if(b)b.click();})()')
    await sleep(400)
  }

  // 设置页
  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(700)
  await shot('45-settings-themes.png')

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})