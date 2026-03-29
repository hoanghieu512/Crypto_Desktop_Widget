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
    minHeight: 400,
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
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
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
