const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => {
    ipcRenderer.send('window-minimize')
  },
  close: () => {
    ipcRenderer.send('window-close')
  },
  setAlwaysOnTop: (on) => ipcRenderer.invoke('electron-set-always-on-top', on),
  isAlwaysOnTop: () => ipcRenderer.invoke('electron-is-always-on-top'),
  fetchText: (url) => ipcRenderer.invoke('electron-fetch-text', url),
})
