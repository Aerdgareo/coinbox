const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const OUT = path.join(__dirname, '..', 'screenshots')
app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-futaba'))

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
  await sleep(700)

  // 找到「双叶凑音」分组并展开
  const info = await js(`(function(){
    var heads = document.querySelectorAll('.theme-group-head');
    for (var i=0;i<heads.length;i++){
      if (heads[i].textContent.indexOf('双叶凑音') >= 0){
        var head = heads[i];
        var body = head.parentNode.querySelector('.theme-group-body');
        if (body.clientHeight < 60) head.click();
        return JSON.stringify({
          idx: i,
          countText: head.querySelector('.tg-count').textContent,
          cards: body.querySelectorAll('.theme-card').length,
          firstName: body.querySelector('.tc-name').textContent,
          lastName: body.querySelectorAll('.tc-name')[body.querySelectorAll('.tc-name').length-1].textContent,
          pending: document.querySelectorAll('.theme-card.pending').length
        });
      }
    }
    return 'NOTFOUND';
  })()`)
  console.log('GROUP', info)
  await sleep(600)

  // 截图分组区域
  await js(`(function(){
    var heads=document.querySelectorAll('.theme-group-head');
    for (var i=0;i<heads.length;i++){
      if (heads[i].textContent.indexOf('双叶凑音')>=0){ heads[i].scrollIntoView({block:'start'}); window.scrollBy(0,-70); }
    }
  })()`)
  await sleep(700)
  await shot('90-futaba-group.png')

  // 选第一张，回首页看效果
  await js('document.querySelector(\'[data-theme-id="photo-futaba-01"]\').click()')
  await sleep(900)
  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(900)
  await shot('91-futaba-01.png')
  console.log('BG', await js('(function(){return document.getElementById("bgBase").style.backgroundImage.slice(-40);})()'))

  // 再看一张
  await js('document.querySelector(\'[data-tab="settings"]\').click()')
  await sleep(600)
  await js('document.querySelector(\'[data-theme-id="photo-futaba-12"]\').click()')
  await sleep(900)
  await js('document.querySelector(\'[data-tab="home"]\').click()')
  await sleep(900)
  await shot('92-futaba-12.png')

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e && e.message)
  app.quit()
})
