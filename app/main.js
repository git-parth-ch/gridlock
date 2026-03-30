// app/main.js  –  Electron main process
const {
  app, BrowserWindow, globalShortcut, ipcMain, shell, Menu
} = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,          // true kiosk mode on macOS
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false       // disable devtools in production
    }
  });

  // Best-effort: discourage OS-level screen capture (not foolproof)
  try { mainWindow.setContentProtection(true); } catch (_) {}


  // In dev, VITE_DEV_SERVER_URL is set by the dev script
  if (process.env.VITE_DEV === '1') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Block right-click context menu
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  // Intercept new window / navigation attempts
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      e.preventDefault();
    }
  });

  // Remove application menu
  Menu.setApplicationMenu(null);

  // Fullscreen enforcement – re-enter if exited
  mainWindow.on('leave-full-screen', () => {
    mainWindow.setFullScreen(true);
    mainWindow.webContents.send('fullscreen-exit-warning');
  });
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});

// ── Blocked shortcuts ───────────────────────────────────────
const BLOCKED = [
  'CmdOrCtrl+Q', 'Alt+F4',
  'CmdOrCtrl+W', 'CmdOrCtrl+H', 'CmdOrCtrl+M',
  'CmdOrCtrl+R', 'CmdOrCtrl+Shift+R',
  'F5', 'F12',
  'CmdOrCtrl+Shift+I', 'CmdOrCtrl+Shift+J', 'CmdOrCtrl+Option+I',
  'CmdOrCtrl+U',        // view source
  'CmdOrCtrl+P',        // print
  'PrintScreen',
  'CmdOrCtrl+Tab', 'Alt+Tab',
  'Meta+Tab',           // macOS cmd+tab
  'Meta+Space',         // spotlight
  'Ctrl+Escape',        // windows start
];

function registerShortcuts() {
  BLOCKED.forEach(sc => {
    try {
      globalShortcut.register(sc, () => {
        mainWindow?.webContents.send('shortcut-blocked', sc);
      });
    } catch (_) { }
  });
}

app.on('will-quit', () => globalShortcut.unregisterAll());

// Prevent all quit attempts
app.on('before-quit', (e) => {
  const { status } = global.sessionStatus || {};
  if (status !== 'ended') e.preventDefault();
});

// IPC: renderer → main
ipcMain.on('session-ended', () => {
  global.sessionStatus = { status: 'ended' };
  app.quit();
});

ipcMain.handle('get-platform', () => process.platform);

// Enable Do Not Disturb  (macOS)
ipcMain.handle('enable-dnd', async () => {
  if (process.platform === 'darwin') {
    const { exec } = require('child_process');
    exec(`osascript -e 'tell application "System Events" to tell process "NotificationCenter" to set value of checkbox 1 of window 1 to true'`);
  }
});

app.on('window-all-closed', (e) => e.preventDefault());