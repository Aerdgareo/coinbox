/**
 * v1.0.6 校验：每张背景独立的压暗 / 用户自添背景库 / 压暗重置
 * 运行：npx electron scripts/check-v106.cjs
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-v106'))

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
      children: [{ id: 'c1', name: '机身', target: 800, saved: 200, priority: 1, doneAt: null }],
      createdAt: 1,
      doneAt: null
    }
  ],
  settings: { bgMode: 'theme', theme: 'photo-congyu-01', dimX: 50, dimY: 20, dimSpread: 100, dimStrength: 100 },
  draw: { date: '', used: 0, usedByGoal: {}, tiers: null },
  history: []
}

let fails = 0
function check(name, cond, extra) {
  if (cond) console.log('  ok  ' + name)
  else {
    fails++
    console.log(' FAIL ' + name + (extra != null ? ' :: ' + JSON.stringify(extra) : ''))
  }
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
  }
  const dimState = () =>
    js(
      '(function(){var s=JSON.parse(localStorage.getItem("coinbox.state.v2")).settings;' +
        'return JSON.stringify({x:s.dimX,y:s.dimY,sp:s.dimSpread,st:s.dimStrength,bg:s.bgMode,theme:s.theme,ub:s.userBgId,presets:s.dimPresets})})()'
    ).then(JSON.parse)

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(900)

  console.log('\n== C. 旧版单张背景迁移 ==')
  await js(
    '(function(){var cv=document.createElement("canvas");cv.width=64;cv.height=64;var g=cv.getContext("2d");' +
      'g.fillStyle="#16a34a";g.fillRect(0,0,64,64);' +
      'localStorage.clear();' +
      'localStorage.setItem("coinbox.bgimage.v1", cv.toDataURL("image/jpeg",0.8));' +
      'var old=' + JSON.stringify(JSON.stringify({ v: 2, activeGoal: 'g_a', goals: SEED.goals, settings: { bgMode: 'image' }, draw: SEED.draw, history: [] })) + ';' +
      'localStorage.setItem("coinbox.state.v2", old);return 1})()'
  )
  win.webContents.reload()
  await sleep(1600)
  const legacy = await js(
    '(function(){var s=JSON.parse(localStorage.getItem("coinbox.state.v2"));' +
      'var l=JSON.parse(localStorage.getItem("coinbox.userbgs.v1")||"[]");' +
      'return JSON.stringify({n:l.length,id:l[0]&&l[0].id,ub:s.settings.userBgId,old:!!localStorage.getItem("coinbox.bgimage.v1"),' +
      'bg:document.getElementById("bgBase").style.backgroundImage.slice(0,20)})})()'
  ).then(JSON.parse)
  check('C1 旧图迁移成 1 张自添背景', legacy.n === 1 && legacy.id === 'ub_legacy', legacy)
  check('C2 当前背景指向它', legacy.ub === 'ub_legacy', legacy)
  check('C3 旧 key 已清掉', legacy.old === false, legacy)
  check('C4 背景层已用这张图', legacy.bg.indexOf('data:image') >= 0, legacy.bg)

  await js('localStorage.clear(); localStorage.setItem("coinbox.state.v2", ' + JSON.stringify(JSON.stringify(SEED)) + '); 1')
  win.webContents.reload()
  await sleep(1500)

  console.log('\n== A. 每张背景独立 ==')
  await js('document.querySelector("[data-tab=settings]").click()')
  await sleep(700)

  // A1：当前 congya-01 调 dimX = 70
  await js(
    '(function(){var r=document.getElementById("dim-x");r.value="70";r.dispatchEvent(new Event("input",{bubbles:true}));r.dispatchEvent(new Event("change",{bubbles:true}));return 1})()'
  )
  await sleep(600)
  let st = await dimState()
  check('A1 dimX 保存为 70', st.x === 70, st.x)
  check('A1 presets 写入 theme:congyu-01', st.presets && st.presets['theme:photo-congyu-01'] && st.presets['theme:photo-congyu-01'].x === 70, st.presets)

  // A2：切到别的立绘，应回到默认 50
  await js('document.querySelector("[data-theme-id=\\"photo-congyu-02\\"]").click()')
  await sleep(800)
  st = await dimState()
  check('A2 换图后 dimX 回默认 50', st.theme === 'photo-congyu-02' && st.x === 50, st)
  check('A2 旧图的 70 仍在 presets', st.presets['theme:photo-congyu-01'].x === 70, st.presets)

  // A3：切回来应还原 70
  await js('document.querySelector("[data-theme-id=\\"photo-congyu-01\\"]").click()')
  await sleep(800)
  st = await dimState()
  check('A3 切回原图还原 70', st.x === 70, st.x)
  const dot = await js('(function(){var d=document.getElementById("dim-dot");return d.style.left})()')
  check('A3 预览圆心跟着到 70%', dot === '70%', dot)
  const tag = await js('(function(){var e=document.querySelector(".dim-cur-tag");return e?e.textContent:""})()')
  check('A3 标签显示已单独调过', tag.indexOf('单独') >= 0, tag)
  const nightBg = await js('document.getElementById("bgNight").style.background')
  check('A3 压暗层跟着这张的参数', nightBg.indexOf('70%') >= 0, nightBg.slice(0, 60))

  // A4：重置按钮
  await js('document.querySelector("#dim-reset").click()')
  await sleep(700)
  st = await dimState()
  check('A4 重置后 dimX=50', st.x === 50, st.x)
  check('A4 重置后该图 presets 被清掉', !st.presets['theme:photo-congyu-01'], st.presets)
  const tag2 = await js('(function(){var e=document.querySelector(".dim-cur-tag");return e?e.textContent:""})()')
  check('A4 标签回到默认值', tag2.indexOf('默认') >= 0, tag2)

  console.log('\n== B. 用户自添背景 ==')
  const groupBefore = await js(
    '(function(){var hs=document.querySelectorAll(".theme-group-head");var out=[];for(var i=0;i<hs.length;i++)out.push(hs[i].textContent);return out.join(" | ")})()'
  )
  check('B1 出现「用户自添」分组', groupBefore.indexOf('用户自添') >= 0, groupBefore)

  // 用 canvas 造两张图，走真实 file input
  const inject = (colorA) =>
    js(
      '(async function(c){' +
        'var cv=document.createElement("canvas");cv.width=600;cv.height=900;var g=cv.getContext("2d");' +
        'var grd=g.createLinearGradient(0,0,600,900);grd.addColorStop(0,c);grd.addColorStop(1,"#101426");' +
        'g.fillStyle=grd;g.fillRect(0,0,600,900);g.fillStyle="#fff";g.font="bold 64px sans-serif";g.fillText("BG",60,120);' +
        'var blob=await new Promise(function(r){cv.toBlob(r,"image/jpeg",0.9)});' +
        'var f=new File([blob],"我的壁纸"+Math.random().toString(36).slice(2,6)+".jpg",{type:"image/jpeg"});' +
        'var dt=new DataTransfer();dt.items.add(f);var inp=document.getElementById("ub-file");' +
        'inp.files=dt.files;inp.dispatchEvent(new Event("change",{bubbles:true}));return 1})(' +
      JSON.stringify(colorA) +
      ')'
    )

  await inject('#c2410c')
  await sleep(2200)
  await inject('#1d4ed8')
  await sleep(2200)
  let bgs = await js('JSON.parse(localStorage.getItem("coinbox.userbgs.v1")||"[]").length')
  check('B2 两张都存进 userbgs', bgs === 2, bgs)
  const cardCount = await js('document.querySelectorAll("[data-usebg]").length')
  check('B3 分组里出现 2 张卡片', cardCount === 2, cardCount)
  const hasThumb = await js(
    '(function(){var l=JSON.parse(localStorage.getItem("coinbox.userbgs.v1"));return l[0].thumb.slice(0,22)+"|"+l[0].thumb.length})()'
  )
  check('B3 缩略图单独生成且很小', hasThumb.indexOf('data:image/jpeg') === 0 && Number(hasThumb.split('|')[1]) < 40000, hasThumb)
  st = await dimState()
  check('B4 添加后自动切到自定义图片', st.bg === 'image' && !!st.ub, st)
  await js('document.querySelector("[data-usebg]").scrollIntoView({block:"center"})')
  await sleep(500)
  await shot('100-user-bg-group.png')

  // B5：给第二张单独调压暗
  const ids = await js('JSON.parse(localStorage.getItem("coinbox.userbgs.v1")).map(function(b){return b.id})')
  await js('document.querySelector("[data-usebg=\\"' + ids[0] + '\\"]").click()')
  await sleep(800)
  await js('document.querySelector("#dim-pv").scrollIntoView({block:"center"})')
  await sleep(400)
  await js(
    '(function(){var r=document.getElementById("dim-y");r.value="58";r.dispatchEvent(new Event("input",{bubbles:true}));r.dispatchEvent(new Event("change",{bubbles:true}));return 1})()'
  )
  await sleep(700)
  st = await dimState()
  check('B5 第一张 dimY=58 且写入 user:' + ids[0], st.y === 58 && st.presets['user:' + ids[0]] && st.presets['user:' + ids[0]].y === 58, st)

  await js('document.querySelector("[data-usebg=\\"' + ids[1] + '\\"]").click()')
  await sleep(800)
  st = await dimState()
  check('B6 第二张仍是默认 dimY=20', st.y === 20 && st.ub === ids[1], st)
  check('B6 没调过的背景不写 presets（标签显示默认）', !st.presets['user:' + ids[1]], st.presets)
  const tagB = await js('(function(){var e=document.querySelector(".dim-cur-tag");return e?e.textContent:""})()')
  check('B6 标签显示默认值', tagB.indexOf('默认') >= 0, tagB)
  await shot('101-dim-per-userbg.png')

  await js('document.querySelector("[data-usebg=\\"' + ids[0] + '\\"]").click()')
  await sleep(800)
  st = await dimState()
  check('B7 切回第一张还原 dimY=58', st.y === 58, st.y)
  await js('document.getElementById("bg-pick").scrollIntoView({block:"center"})')
  await sleep(400)
  await shot('103-bg-card-current.png')

  // B8：删除当前那张 → 自动落到剩下的
  await js(
    '(function(){var b=document.querySelector("[data-delbg=\\"' + ids[0] + '\\"]");b.dispatchEvent(new MouseEvent("click",{bubbles:true}));return 1})()'
  )
  await sleep(600)
  await js('(function(){var y=document.querySelector("[data-confirm-yes]");if(y)y.click();return 1})()')
  await sleep(900)
  bgs = await js('JSON.parse(localStorage.getItem("coinbox.userbgs.v1")||"[]")')
  check('B8 第一张已删除，只剩 1 张', bgs.length === 1 && bgs[0].id === ids[1], bgs.map((b) => b.id))
  st = await dimState()
  check('B8 当前背景落到剩下那张', st.ub === ids[1] && st.bg === 'image', st)
  check('B8 被删背景的压暗配置一起清掉', !st.presets['user:' + ids[0]], st.presets)
  await shot('102-after-delete.png')

  // B9：删到空 → 回到跟随主题
  await js(
    '(function(){var b=document.querySelector("[data-delbg=\\"' + ids[1] + '\\"]");b.dispatchEvent(new MouseEvent("click",{bubbles:true}));return 1})()'
  )
  await sleep(600)
  await js('(function(){var y=document.querySelector("[data-confirm-yes]");if(y)y.click();return 1})()')
  await sleep(900)
  st = await dimState()
  const emptyGroup = await js('(function(){var e=document.querySelector(".theme-group-head .tg-count");var hs=document.querySelectorAll(".theme-group-head");for(var i=0;i<hs.length;i++){if(hs[i].textContent.indexOf("用户自添")>=0)return hs[i].querySelector(".tg-count").textContent}return ""})()')
  check('B9 删空后回跟随主题', st.bg === 'theme' && st.ub === '', st)
  check('B9 分组显示为空', emptyGroup.indexOf('空') >= 0, emptyGroup)

  // B10：纯色/渐变没有 key，压暗重置不报错
  await js('document.querySelector("[data-bgmode=gradient]").click()')
  await sleep(800)
  const smooth = await js('(function(){try{document.querySelector("#dim-reset").click();return "ok"}catch(e){return "err:"+e.message}})()')
  check('B10 渐变背景点重置不报错', smooth === 'ok', smooth)

  console.log('\n== D. 导出 / 导入带图库 ==')
  await inject('#0f766e')
  await sleep(2000)
  await inject('#7c3aed')
  await sleep(2000)
  await js(
    '(function(){var r=document.getElementById("dim-strength");r.value="140";r.dispatchEvent(new Event("input",{bubbles:true}));r.dispatchEvent(new Event("change",{bubbles:true}));return 1})()'
  )
  await sleep(600)
  await js('document.querySelector("[data-export]").click()')
  await sleep(600)
  const expText = await js('document.getElementById("exp-text")?document.getElementById("exp-text").value:""')
  let parsed = null
  try {
    parsed = JSON.parse(expText)
  } catch (e) {}
  check('D1 导出包含 2 张自添背景', parsed && parsed.userBgs && parsed.userBgs.length === 2, parsed ? parsed.userBgs && parsed.userBgs.length : 'no json')
  check(
    'D2 导出包含压暗配置',
    parsed && parsed.settings.dimPresets && Object.keys(parsed.settings.dimPresets).length >= 1,
    parsed ? parsed.settings.dimPresets : null
  )
  await js('document.querySelector("[data-sheet-close]").click()')
  await sleep(400)

  // 清掉本地图库后再从备份导回来
  await js('localStorage.removeItem("coinbox.userbgs.v1"); localStorage.setItem("coinbox.state.v2", ' + JSON.stringify(JSON.stringify(SEED)) + '); 1')
  win.webContents.reload()
  await sleep(1500)
  await js('document.querySelector("[data-tab=settings]").click()')
  await sleep(600)
  await js('document.querySelector("[data-import]").click()')
  await sleep(600)
  await js('(function(){document.getElementById("imp-text").value=' + JSON.stringify(expText) + ';document.getElementById("imp-do").click();return 1})()')
  await sleep(1200)
  const after = await js(
    '(function(){var s=JSON.parse(localStorage.getItem("coinbox.state.v2"));var l=JSON.parse(localStorage.getItem("coinbox.userbgs.v1")||"[]");' +
      'return JSON.stringify({n:l.length,ub:s.settings.userBgId,presets:Object.keys(s.settings.dimPresets||{}).length,cards:document.querySelectorAll("[data-usebg]").length})})()'
  ).then(JSON.parse)
  check('D3 导入后图库恢复 2 张', after.n === 2, after)
  check('D4 导入后选中的背景仍有效', !!after.ub, after)
  check('D5 导入后压暗配置还在', after.presets >= 1, after)
  check('D6 设置页渲染出 2 张卡片', after.cards === 2, after)

  console.log('\n' + (fails ? 'FAILED ' + fails : 'ALL PASS'))
  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})
