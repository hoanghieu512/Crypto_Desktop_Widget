const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

/** Dev: Vite (ELECTRON_DEV=1). Prod: file:// dist/index.html */
const useDevServer = process.env.ELECTRON_DEV === '1'
const devServerUrl =
  process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'

const MARGIN = 16

/** Default đủ rộng cho 2 card Vàng VN/TG cạnh nhau (grid-cols-2 từ ≥380px) */
const DEFAULT_WIDTH = 440
const DEFAULT_HEIGHT = 640

/** Window state: nhớ size + vị trí qua các lần mở (userData/window-state.json) */
const windowStatePath = () => path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState() {
  try {
    const raw = fs.readFileSync(windowStatePath(), 'utf-8')
    const s = JSON.parse(raw)
    if (
      typeof s?.x === 'number' && typeof s?.y === 'number' &&
      typeof s?.width === 'number' && typeof s?.height === 'number' &&
      s.width >= 300 && s.height >= 480
    ) {
      return s
    }
  } catch {
    /* chưa có state hoặc file hỏng — dùng default */
  }
  return null
}

/**
 * Vị trí lưu phải còn hợp lệ với cấu hình màn hình hiện tại:
 * cần ít nhất một display có workArea giao với cửa sổ đủ lớn để kéo lại được.
 * Màn cũ không còn → trả false → đặt về bottom-right màn chính.
 */
function isVisibleOnSomeDisplay(state) {
  const MIN_VISIBLE = 64
  return screen.getAllDisplays().some(({ workArea }) => {
    const overlapW =
      Math.min(state.x + state.width, workArea.x + workArea.width) -
      Math.max(state.x, workArea.x)
    const overlapH =
      Math.min(state.y + state.height, workArea.y + workArea.height) -
      Math.max(state.y, workArea.y)
    return overlapW >= MIN_VISIBLE && overlapH >= MIN_VISIBLE
  })
}

function saveWindowState(win) {
  try {
    if (win.isDestroyed() || win.isMinimized()) return
    const b = win.getBounds()
    fs.writeFileSync(windowStatePath(), JSON.stringify(b))
  } catch {
    /* save best-effort — không chặn close */
  }
}

function placeInBottomRight(win) {
  const { workArea } = screen.getPrimaryDisplay()
  const bounds = win.getBounds()
  const x = Math.round(workArea.x + workArea.width - bounds.width - MARGIN)
  const y = Math.round(workArea.y + workArea.height - bounds.height - MARGIN)
  win.setPosition(x, y)
}

function createWindow() {
  const saved = loadWindowState()
  const restorable = saved != null && isVisibleOnSomeDisplay(saved)

  const win = new BrowserWindow({
    // Màn cũ không còn → giữ size đã lưu, chỉ reset vị trí (bottom-right màn chính)
    width: saved ? saved.width : DEFAULT_WIDTH,
    height: saved ? saved.height : DEFAULT_HEIGHT,
    ...(restorable ? { x: saved.x, y: saved.y } : {}),
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
    // Có state hợp lệ → giữ nguyên vị trí đã restore; không thì bottom-right
    if (!restorable) placeInBottomRight(win)
    win.show()
  })

  // Lưu bounds: debounce khi move/resize + chốt lần cuối khi close
  let saveTimer = null
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveWindowState(win), 400)
  }
  win.on('move', scheduleSave)
  win.on('resize', scheduleSave)
  win.on('close', () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveWindowState(win)
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
  /** Dev: Dock dùng icon Electron mặc định — set icon app từ build/.
      Prod không cần: .icns đã đóng gói trong .app bundle. */
  if (useDevServer && process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(path.join(__dirname, '..', 'build', 'icon.png'))
    } catch {
      /* icon chưa generate — bỏ qua, không chặn dev */
    }
  }

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
