// app/preload.js  –  Secure bridge between main and renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listeners from main
  onShortcutBlocked:    (cb) => ipcRenderer.on('shortcut-blocked',       (_, sc) => cb(sc)),
  onFullscreenWarning:  (cb) => ipcRenderer.on('fullscreen-exit-warning', ()    => cb()),
  onSessionFrozenMain:  (cb) => ipcRenderer.on('session-frozen-main',     ()    => cb()),

  // Calls to main
  sessionEnded:  () => ipcRenderer.send('session-ended'),
  getPlatform:   () => ipcRenderer.invoke('get-platform'),
  enableDND:     () => ipcRenderer.invoke('enable-dnd'),
});