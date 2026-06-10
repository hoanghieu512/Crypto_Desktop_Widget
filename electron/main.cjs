const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('node:path')

/** Dev: Vite (ELECTRON_DEV=1). Prod: file:// dist/index.html */
const useDevServer = process.env.ELECTRON_DEV === '1'
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'

const MARGIN = 16

function placeInBottomRight(win) {
  const { workArea } = screen.getPrimaryDisplay()
  const bounds = win.getBounds()
  const x = Math.round(workArea.x + workArea.width - bounds.width - MARGIN)
  const y = Math.round(workArea.y + workArea.height - bounds.height - MARGIN)
  win.setPosition(x, y)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 600,
    minWidth: 300,
    /** Đủ cao cho header h-14 + tab + nội dung + footer kéo — tránh chồng lấn */
    minHeight: 480,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#020617',
    roundedCorners: true,
    /** Windows: ẩn khỏi taskbar (widget); macOS bỏ qua hành vi này */
    skipTaskbar: process.platform === 'win32',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => {
    placeInBottomRight(win)
    win.show()
  })

  if (useDevServer) {
    win.loadURL(devServerUrl)
  } else {
    // app.getAppPath() = project root in dev, app.asar root in packaged build
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }

  return win
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('window-minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.on('window-close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

ipcMain.handle('electron-set-always-on-top', (event, on) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  win.setAlwaysOnTop(Boolean(on))
  return win.isAlwaysOnTop()
})

ipcMain.handle('electron-is-always-on-top', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win ? win.isAlwaysOnTop() : false
})

/** Fetch URL text từ main process — bypass CORS cho renderer */
ipcMain.handle('electron-fetch-text', async (event, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { ok: false, status: 0, text: '' }
  }
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoWidget/1.1; Electron)',
      },
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  } catch {
    return { ok: false, status: 0, text: '' }
  }
})
