const { app, BrowserWindow } = require('electron')
const path = require('path')

app.disableHardwareAcceleration()
app.setPath('userData', path.join(__dirname, '..', '.tmp-debug'))

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
    webPreferences: { contextIsolation: true, sandbox: true }
  })
  win.webContents.on('console-message', function (e, l, m) {
    console.log('[console ' + l + ']', m)
  })

  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  await sleep(1500)

  const r1 = await win.webContents.executeJavaScript(`(function(){
    var btn=document.querySelector('[data-open-draw]');
    var before=JSON.parse(localStorage.getItem('coinbox.state.v2')).draw.used;
    btn.click();
    var ov=document.getElementById('overlay');
    var st=JSON.parse(localStorage.getItem('coinbox.state.v2'));
    return {
      hidden: ov.hidden,
      htmlLen: ov.innerHTML.length,
      text: (ov.innerText||'').slice(0,160),
      hasGo: !!document.querySelector('#gacha-go'),
      usedBefore: before,
      usedAfter: st.draw.used,
      saved: st.goals[0].saved
    };
  })()`)
  console.log('AFTER OPEN:', JSON.stringify(r1, null, 2))

  await sleep(600)
  console.log(
    'T+600ms:',
    JSON.stringify(
      await win.webContents.executeJavaScript(`(function(){
        var ov=document.getElementById('overlay');
        var st=JSON.parse(localStorage.getItem('coinbox.state.v2'));
        return { text:(ov.innerText||'').slice(0,200), used:st.draw.used, saved:st.goals[0].saved, hasGo:!!document.querySelector('#gacha-go'), hasAgain:!!document.querySelector('#gacha-again') };
      })()`)
    )
  )

  await sleep(900)
  console.log(
    'T+1500ms:',
    JSON.stringify(
      await win.webContents.executeJavaScript(`(function(){
        var ov=document.getElementById('overlay');
        var st=JSON.parse(localStorage.getItem('coinbox.state.v2'));
        return { text:(ov.innerText||'').slice(0,260), used:st.draw.used, saved:st.goals[0].saved, hasGo:!!document.querySelector('#gacha-go'), hasAgain:!!document.querySelector('#gacha-again') };
      })()`)
    )
  )

  const r2 = await win.webContents.executeJavaScript(`(function(){
    var go=document.querySelector('#gacha-go');
    go.click();
    var st=JSON.parse(localStorage.getItem('coinbox.state.v2'));
    return { used:st.draw.used, saved:st.goals[0].saved, btnText:go.textContent, stageClass:document.getElementById('gacha-stage').className };
  })()`)
  console.log('AFTER GO:', JSON.stringify(r2, null, 2))

  await sleep(500)
  console.log(
    'GO+500ms:',
    JSON.stringify(
      await win.webContents.executeJavaScript(`(function(){
        var ov=document.getElementById('overlay');
        return { text:(ov.innerText||'').slice(0,220), hasGo:!!document.querySelector('#gacha-go'), hasAgain:!!document.querySelector('#gacha-again'), stageClass:(document.getElementById('gacha-stage')||{}).className };
      })()`)
    )
  )

  await sleep(1200)
  console.log(
    'GO+1700ms:',
    JSON.stringify(
      await win.webContents.executeJavaScript(`(function(){
        var ov=document.getElementById('overlay');
        return { text:(ov.innerText||'').slice(0,280), hasGo:!!document.querySelector('#gacha-go'), hasAgain:!!document.querySelector('#gacha-again') };
      })()`)
    )
  )

  console.log(
    'ERRORS:',
    await win.webContents.executeJavaScript('window.__errs ? window.__errs : "none"')
  )

  win.destroy()
  app.quit()
}

app.whenReady().then(main).catch(function (e) {
  console.error('FAIL', e)
  app.quit()
})