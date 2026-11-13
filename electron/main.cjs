const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

const devUrl = process.env.VITE_DEV_SERVER_URL
const debug = !!process.env.COINBOX_DEBUG
const logPath = path.join(os.tmpdir(), 'coinbox-main.log')


function log(msg) {
  if (!debug) return
  try {
    fs.appendFileSync(logPath, new Date().toISOString() + ' ' + msg + '\n')
  } catch (e) {}
}

if (debug) {
  try {
    fs.writeFileSync(logPath, '')
  } catch (e) {}
}

process.on('uncaughtException', function (e) {
  log('uncaughtException: ' + (e && e.stack ? e.stack : e))
})
process.on('unhandledRejection', function (e) {
  log('unhandledRejection: ' + (e && e.stack ? e.stack : e))
})

function createWindow() {
  log('createWindow start')
  const win = new BrowserWindow({
    width: 1024,
    height: 760,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0b0d18',
    title: '攒钱盲盒',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })
  log('window created')

  win.setMenuBarVisibility(false)
  if (devUrl) win.setIcon(path.join(__dirname, '../build/icon.ico'))

  win.once('ready-to-show', function () {
    log('ready-to-show')
    win.show()
  })
  win.on('closed', function () {
    log('window closed')
  })
  win.webContents.on('did-fail-load', function (e, code, desc, url) {
    log('did-fail-load code=' + code + ' desc=' + desc + ' url=' + url)
  })
  win.webContents.on('render-process-gone', function (e, d) {
    log('render-process-gone ' + JSON.stringify(d))
  })
  win.webContents.on('console-message', function (e, level, msg) {
    log('console[' + level + '] ' + msg)
  })

  const target = devUrl || path.join(__dirname, '../dist/index.html')
  log('loading ' + target)
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(target)
  }

  win.webContents.setWindowOpenHandler(function (details) {
    if (/^https?:/i.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', function (e, url) {
    log('will-navigate ' + url)
    if (devUrl && url.indexOf(devUrl) === 0) return
    if (!devUrl && url.indexOf('file://') === 0) return
    e.preventDefault()
    if (/^https?:/i.test(url)) shell.openExternal(url)
  })
}

app.whenReady().then(function () {
  log('app ready')
  createWindow()
  app.on('activate', function () {
    log('activate')
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  log('window-all-closed platform=' + process.platform)
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', function () {
  log('before-quit')
})