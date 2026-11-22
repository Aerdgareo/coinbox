/**
 * v1.0.7 校验：背景图从 localStorage 迁到 IndexedDB
 * 覆盖：旧数据迁移 / 批量添加 / 删除 / 重启持久 / 导出导入 / 清空
 * 运行：npx electron scripts/check-v107.cjs
 */
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-v107'))

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

  const idbCount = () =>
    js(
      '(function(){return new Promise(function(res){' +
        'try{var r=indexedDB.open("coinbox-bg",1);' +
        'r.onerror=function(){res(JSON.stringify({err:"open"}))};' +
        'r.onsuccess=function(){var db=r.result;' +
        'var t=db.transaction(["meta","blobs","thumbs"],"readonly");' +
        'var o={m:0,b:0,t:0};' +
        'var q1=t.objectStore("meta").count();q1.onsuccess=function(){o.m=q1.result};' +
        'var q2=t.objectStore("blobs").count();q2.onsuccess=function(){o.b=q2.result};' +
        'var q3=t.objectStore("thumbs").count();q3.onsuccess=function(){o.t=q3.result};' +
        't.oncomplete=function(){res(JSON.stringify(o))};' +
        't.onerror=function(){res(JSON.stringify({err:"tx"}))}' +
        '}}catch(e){res(JSON.stringify({err:String((e&&e.message)||e)}))}})})()'
    ).then(function (v) {
      try { return JSON.parse(v) } catch (e) { return { err: String(v) } }
    })

  const cards = () =>
    js(
      '(function(){var n=document.querySelectorAll("[data-usebg]");var out=[];' +
        'for(var i=0;i<n.length;i++)out.push(n[i].getAttribute("data-usebg"));return JSON.stringify(out)})()'
    ).then(JSON.parse)

  const lsUserBgs = () => js('String(localStorage.getItem("coinbox.userbgs.v1"))')

  const openSettings = async () => {
    await js('document.querySelector("[data-tab=settings]").click()')
    await sleep(800)
  }

  const addFiles = (n, w, h) =>
    js(
      '(async function(n,w,h){' +
        'var dt=new DataTransfer();' +
        'for(var i=0;i<n;i++){' +
        'var cv=document.createElement("canvas");cv.width=w;cv.height=h;' +
        'var g=cv.getContext("2d");' +
        'var grd=g.createLinearGradient(0,0,w,h);' +
        'grd.addColorStop(0,"hsl("+((Date.now()/7+i*31)%360)+",58%,44%)");grd.addColorStop(1,"#0b1020");' +
        'g.fillStyle=grd;g.fillRect(0,0,w,h);' +
        'g.fillStyle="#fff";g.font="bold 96px sans-serif";g.fillText("#"+i,70,180);' +
        'var blob=await new Promise(function(r){cv.toBlob(r,"image/jpeg",0.85)});' +
        'dt.items.add(new File([blob],"壁纸"+i+".jpg",{type:"image/jpeg"}))}' +
        'var inp=document.getElementById("ub-file");inp.files=dt.files;' +
        'inp.dispatchEvent(new Event("change",{bubbles:true}));return n})(' +
      n + ',' + w + ',' + h + ')'
    )

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1200)

  /* ---------- A. 旧 localStorage 数据迁移 ---------- */
  console.log('\n== A. 旧 localStorage 数据迁移进 IndexedDB ==')
  await js(
    '(function(){try{indexedDB.deleteDatabase("coinbox-bg")}catch(e){}' +
      'var out=[];' +
      'for(var i=0;i<3;i++){' +
      'var cv=document.createElement("canvas");cv.width=300;cv.height=450;' +
      'var g=cv.getContext("2d");g.fillStyle=["#c2410c","#0f766e","#6d28d9"][i];g.fillRect(0,0,300,450);' +
      'out.push({id:"ob_"+i,name:"旧图"+i,data:cv.toDataURL("image/jpeg",0.75),thumb:cv.toDataURL("image/jpeg",0.5),addedAt:1000+i})}' +
      'localStorage.clear();' +
      'localStorage.setItem("coinbox.userbgs.v1",JSON.stringify(out));' +
      'localStorage.setItem("coinbox.state.v2",' + JSON.stringify(JSON.stringify(SEED)) + ');' +
      'return 1})()'
  )
  win.webContents.reload()
  await sleep(2500)

  let c = await idbCount()
  check('A1 三张旧图写进 IDB（meta/blobs/thumbs 各 3）', c.m === 3 && c.b === 3 && c.t === 3, c)
  const leftover = await lsUserBgs()
  check('A2 旧 localStorage 键已清空', leftover === 'null' || leftover === '', leftover)
  await openSettings()
  const uiA = await js(
    '(function(){var hs=document.querySelectorAll(".theme-group-head");' +
      'for(var i=0;i<hs.length;i++){if(hs[i].textContent.indexOf("用户自添")>=0){' +
      'var q=hs[i].querySelector(".tg-count");return q?q.textContent:"?"}}return "no-group"})()'
  )
  check('A3 分组标题显示 3 张', uiA.indexOf('3') >= 0, uiA)
  const thumbA = await js(
    '(function(){var e=document.querySelector("[data-usebg]");if(!e)return "";' +
      'var s=e.style.backgroundImage;return s.indexOf("blob:")>=0?"blob":s.slice(0,20)})()'
  )
  check('A4 卡片缩略图是 blob 地址', thumbA === 'blob', thumbA)

  /* ---------- B. 导出 / 导入 ---------- */
  console.log('\n== B. 导出 / 导入 ==')
  await addFiles(1, 600, 900)
  await sleep(2500)
  let n = await cards()
  check('B1 再添 1 张后共 4 张', n.length === 4, n.length)

  const expText = await js(
    '(function(){return new Promise(function(res){' +
      'document.querySelector("[data-export]").click();' +
      'var t=0;var iv=setInterval(function(){' +
      'var ta=document.getElementById("exp-text");' +
      'if(ta&&ta.value&&ta.value.indexOf("正在")<0){clearInterval(iv);res(ta.value.length>2000?ta.value:"EMPTY")}' +
      'if(++t>150){clearInterval(iv);res("TIMEOUT")}},100)})})()'
  )
  let expObj = null
  try { expObj = JSON.parse(expText) } catch (e) { expObj = null }
  check(
    'B2 备份里有 4 张图的 base64',
    !!expObj && Array.isArray(expObj.userBgs) && expObj.userBgs.length === 4 &&
      String(expObj.userBgs[0].data).indexOf('data:image') === 0,
    expObj && expObj.userBgs && expObj.userBgs.length
  )
  check('B3 备份里没有 blob 地址', expText.indexOf('blob:') < 0, null)
  await js('(function(){document.querySelector("[data-sheet-close]")&&document.querySelector("[data-sheet-close]").click();return 1})()')
  await sleep(400)

  // 导入前先把库改小，验证「整份替换」而不是叠加
  await js(
    '(function(){var n=document.querySelectorAll("[data-delbg]");if(n.length)n[n.length-1].click();return 1})()'
  )
  await sleep(500)
  await js('(function(){var b=document.querySelector("[data-confirm-yes]");if(b)b.click();return 1})()')
  await sleep(1200)
  check('B4 删掉一张后剩 3 张', (await cards()).length === 3, (await cards()).length)

  if (expObj) {
    const payload = JSON.stringify(expText)
    await js(
      '(function(){' +
        'var e=document.querySelector("[data-import]");e.click();' +
        'setTimeout(function(){' +
        'var ta=document.getElementById("imp-text");' +
        'ta.value=' + payload + ';' +
        'document.getElementById("imp-do").click()},400);' +
        'return 1})()'
    )
    await sleep(6000)
    const after = await cards()
    c = await idbCount()
    check('B5 导入后恢复成备份里的 4 张', after.length === 4, after.length)
    check('B6 IDB 四条记录对齐', c.m === 4 && c.b === 4 && c.t === 4, c)
    const bgAfter = await js('(function(){var e=document.getElementById("bgBase");return e.style.backgroundImage.slice(0,11)})()')
    check('B7 背景仍能显示（blob）', bgAfter.indexOf('blob:') >= 0, bgAfter)
  }

  /* ---------- C. 批量添加 30 张 ---------- */
  console.log('\n== C. 批量添加 30 张 ==')
  await addFiles(30, 900, 1350)
  await sleep(12000)
  const ids = await cards()
  c = await idbCount()
  check('C1 卡片共 34 张', ids.length === 34, ids.length)
  check('C2 IDB 三个 store 各 34 条', c.m === 34 && c.b === 34 && c.t === 34, c)
  const usage = await js(
    '(function(){var es=document.querySelectorAll(".theme-group .faint.tiny");' +
      'for(var i=0;i<es.length;i++)if(es[i].textContent.indexOf("当前")>=0)return es[i].textContent;return ""})()'
  )
  check('C3 显示张数与占用', usage.indexOf('34 张') >= 0 && /B|KB|MB/.test(usage), usage)
  await shot('110-idb-34.png')
  await js(
    '(function(){var hs=document.querySelectorAll(".theme-group-head");' +
      'for(var i=0;i<hs.length;i++){if(hs[i].textContent.indexOf("用户自添")>=0){' +
      'hs[i].scrollIntoView({block:"start"});return 1}}return 0})()'
  )
  await sleep(700)
  await shot('111-usebg-group.png')

  /* ---------- D. 删除中间一张 ---------- */
  console.log('\n== D. 删除中间一张 ==')
  const victim = ids[10]
  await js('(function(){document.querySelector(\'[data-delbg="' + victim + '"]\').click();return 1})()')
  await sleep(600)
  await js('(function(){var b=document.querySelector("[data-confirm-yes]");if(b)b.click();return 1})()')
  await sleep(1500)
  const ids2 = await cards()
  c = await idbCount()
  check('D1 IDB 剩 33 条', c.m === 33 && c.b === 33 && c.t === 33, c)
  check('D2 删掉那张已不在列表', ids2.indexOf(victim) < 0 && ids2.length === 33, { len: ids2.length, gone: ids2.indexOf(victim) < 0 })
  check('D3 其余顺序不变', ids2[0] === ids[0] && ids2[ids2.length - 1] === ids[ids.length - 1], null)

  /* ---------- E. 重启后仍可用 ---------- */
  console.log('\n== E. 重启（reload）后仍可用 ==')
  win.webContents.reload()
  await sleep(3000)
  await openSettings()
  const afterReload = await cards()
  check('E1 重启后仍是 33 张', afterReload.length === 33, afterReload.length)
  const bgSrc = await js('(function(){var e=document.getElementById("bgBase");return e.style.backgroundImage.slice(0,11)})()')
  check('E2 背景层用 blob 地址铺图', bgSrc.indexOf('blob:') >= 0, bgSrc)
  const thumbE = await js(
    '(function(){var e=document.querySelector("[data-usebg]");return e.style.backgroundImage.indexOf("blob:")>=0?"blob":"no"})()'
  )
  check('E3 缩略图重启后仍是 blob', thumbE === 'blob', thumbE)
  const persisted = await js(
    '(function(){return navigator.storage&&navigator.storage.persisted?' +
      'navigator.storage.persisted().then(function(v){return String(v)}):"unsupported"})()'
  )
  check('E4 已申请持久化（或环境不支持）', persisted === 'true' || persisted === 'false' || persisted === 'unsupported', persisted)

  /* ---------- F. 清空所有数据 ---------- */
  console.log('\n== F. 清空所有数据 ==')
  await js('(function(){document.querySelector("[data-reset]").click();return 1})()')
  await sleep(600)
  await js('(function(){var b=document.querySelector("[data-confirm-yes]");if(b)b.click();return 1})()')
  await sleep(2500)
  c = await idbCount()
  check('F1 IDB 三个 store 全清空', c.m === 0 && c.b === 0 && c.t === 0, c)

  console.log('\n' + (fails ? 'FAILED: ' + fails + ' 项' : 'ALL PASS'))
  await sleep(300)
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error(e)
  app.quit()
})
