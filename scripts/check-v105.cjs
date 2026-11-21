const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-v105'))

function sleep(ms) {
  return new Promise(function (r) {
    setTimeout(r, ms)
  })
}

const SEED = {
  v: 2,
  activeGoal: 'g_a',
  goals: [
    {
      id: 'g_a',
      name: '相机',
      emoji: '📷',
      target: 1200,
      saved: 300,
      ownSaved: 0,
      children: [
        { id: 'c1', name: '机身', target: 800, saved: 200, priority: 1, doneAt: null },
        { id: 'c2', name: '镜头', target: 300, saved: 100, priority: 2, doneAt: null },
        { id: 'c3', name: '存储卡', target: 100, saved: 0, priority: 3, doneAt: null }
      ],
      createdAt: 1,
      doneAt: null
    },
    {
      id: 'g_b',
      name: '键盘',
      emoji: '⌨️',
      target: 600,
      saved: 0,
      ownSaved: 0,
      children: [],
      createdAt: 2,
      doneAt: null
    }
  ],
  settings: { dailyDraws: 1, drawQuota: 'shared', bgMode: 'theme', theme: 'photo-congyu-01' },
  draw: { date: '', used: 0, usedByGoal: {}, tiers: null },
  history: []
}

async function main() {
  const win = new BrowserWindow({
    width: 460,
    height: 920,
    show: true,
    backgroundColor: '#0b0d18',
    webPreferences: { contextIsolation: false, sandbox: false, backgroundThrottling: false }
  })
  const js = (code) => win.webContents.executeJavaScript(code)
  async function shot(name) {
    const img = await win.webContents.capturePage()
    fs.writeFileSync(path.join(OUT, name), img.toPNG())
    console.log('shot', name)
  }
  const log = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v))

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(900)
  await js('localStorage.setItem("coinbox.state.v2", ' + JSON.stringify(JSON.stringify(SEED)) + '); 1')
  win.webContents.reload()
  await sleep(1600)

  log('topbar-actions', await js('document.querySelectorAll(".topbar-actions").length'))
  log('child cards', await js('document.querySelectorAll("[data-child-id]").length'))
  await shot('90-home-child-tap.png')

  // 点首页子目标
  await js('document.querySelector("[data-child-id]").click()')
  await sleep(500)
  log('sheet title', await js('(function(){var e=document.querySelector(".sheet-title");return e?e.textContent:""})()'))
  await shot('91-child-editor.png')
  log('prio before', await js('document.querySelector("#c-prio").textContent'))
  await js('document.querySelector("#c-pdown").click()')
  await sleep(400)
  log('prio after ▼', await js('document.querySelector("#c-prio").textContent'))
  log(
    'children order',
    await js('(function(){var s=JSON.parse(localStorage.getItem("coinbox.state.v2"));return s.goals[0].children.map(function(c){return c.name+":P"+c.priority}).join(" | ")})()')
  )
  await js('document.querySelector("[data-sheet-close]").click()')
  await sleep(400)

  // 目标编辑里的优先级上下键
  await js('document.querySelector("[data-edit-goal]").click()')
  await sleep(500)
  log('steppers up/down', await js('[document.querySelectorAll("[data-cup]").length, document.querySelectorAll("[data-cdown]").length]'))
  await shot('92-goal-editor-stepper.png')
  await js('document.querySelectorAll("[data-cdown]")[1].click()')
  await sleep(300)
  log(
    'chip order in sheet',
    await js('(function(){var rows=document.querySelectorAll("[data-idx]");var out=[];for(var i=0;i<rows.length;i++){out.push(rows[i].querySelector("[data-cname]").value)}return out.join(" > ")})()')
  )
  await shot('93-goal-editor-moved.png')
  await js('document.querySelector("[data-sheet-close]").click()')
  await sleep(400)

  // 设置页
  await js('document.querySelector("[data-tab=settings]").click()')
  await sleep(700)
  log('dim sliders', await js('document.querySelectorAll(".dim-row .rng").length'))
  log('quota seg', await js('document.querySelectorAll("[data-quota]").length'))
  await js('document.querySelector("#dim-pv").scrollIntoView({block:"center"})')
  await sleep(500)
  await js(
    '(function(){var r=document.getElementById("dim-x");r.value="66";r.dispatchEvent(new Event("input",{bubbles:true}));' +
      'var y=document.getElementById("dim-y");y.value="34";y.dispatchEvent(new Event("input",{bubbles:true}));return 1})()'
  )
  await sleep(600)
  await shot('94-dim-preview.png')
  log('dot pos', await js('(function(){var d=document.getElementById("dim-dot");return d.style.left+"/"+d.style.top})()'))
  log('night bg', await js('document.getElementById("bgNight").style.background.slice(0,72)'))
  await js('(function(){var r=document.getElementById("dim-x");r.dispatchEvent(new Event("change",{bubbles:true}));return 1})()')
  await sleep(500)
  log('dimX saved', await js('JSON.parse(localStorage.getItem("coinbox.state.v2")).settings.dimX'))

  // 切每目标模式
  await js('document.querySelector("[data-quota=perGoal]").click()')
  await sleep(600)
  log('quota saved', await js('JSON.parse(localStorage.getItem("coinbox.state.v2")).settings.drawQuota'))

  // 背景调整模式
  await js('document.querySelector("#bg-adjust-open").click()')
  await sleep(900)
  log('adjust classes', await js('document.body.className'))
  log('bar hidden', await js('document.getElementById("bgAdjustBar").hidden'))
  const rng = await js('(function(){var r=document.getElementById("bgZoomRange");r.value="180";r.dispatchEvent(new Event("input",{bubbles:true}));r.dispatchEvent(new Event("change",{bubbles:true}));return r.value})()')
  log('zoom range ->', rng)
  await sleep(300)

  // 模拟拖动
  win.webContents.sendInputEvent({ type: 'mouseDown', x: 230, y: 300, button: 'left', clickCount: 1 })
  for (let i = 1; i <= 6; i++) {
    win.webContents.sendInputEvent({ type: 'mouseMove', x: 230 + i * 8, y: 300 + i * 4, button: 'left' })
    await sleep(30)
  }
  win.webContents.sendInputEvent({ type: 'mouseUp', x: 278, y: 324, button: 'left', clickCount: 1 })
  await sleep(500)
  log('transform', await js('document.getElementById("bgBase").style.transform'))
  await shot('95-bg-adjust.png')
  await js('document.querySelector("#bgAdjustDone").click()')
  await sleep(800)
  log('after done classes', await js('document.body.className'))
  log(
    'saved transform',
    await js('(function(){var s=JSON.parse(localStorage.getItem("coinbox.state.v2")).settings;return "zoom="+s.bgZoom+" x="+s.bgOffX+" y="+s.bgOffY})()')
  )
  await shot('96-after-adjust-home.png')

  // 每目标次数：先回家看文案
  await js('document.querySelector("[data-tab=home]").click()')
  await sleep(600)
  log('home draw sub', await js('(function(){var e=document.querySelector(".draw-entry .s");return e?e.textContent:""})()'))
  log('badge A', await js('(function(){var e=document.querySelector(".draw-badge");return e?e.textContent:""})()'))
  await shot('97-home-pergoal.png')

  await js('document.querySelector("[data-open-draw]").click()')
  await sleep(600)
  await js('document.querySelector("#gacha-go").click()')
  await sleep(2600)
  await js('document.querySelector("[data-sheet-close]") && document.querySelector("[data-sheet-close]").click()')
  await sleep(600)
  log('badge A after draw', await js('(function(){var e=document.querySelector(".draw-badge");return e?e.textContent:""})()'))
  await js('(function(){var c=document.querySelectorAll("[data-goal]");for(var i=0;i<c.length;i++){if(c[i].textContent.indexOf("键盘")>=0){c[i].click();return 1}}return 0})()')
  await sleep(700)
  log('badge B', await js('(function(){var e=document.querySelector(".draw-badge");return e?e.textContent:""})()'))

  console.log('done')
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})
