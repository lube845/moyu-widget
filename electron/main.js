const { app, BrowserWindow, Menu, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const BOUNDS_FILE = path.join(app.getPath('userData'), 'window-bounds.json');
const CARD_SIZE = { width: 280, height: 320 };
/** @type {BrowserWindow | null} */
let win = null;
let alwaysOnTop = true;

function loadSavedBounds() {
  try {
    const raw = fs.readFileSync(BOUNDS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return parsed;
    }
  } catch {
    // 没有历史记录或文件损坏，忽略，走默认位置
  }
  return null;
}

function saveBounds() {
  if (!win) return;
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(BOUNDS_FILE, JSON.stringify(bounds), 'utf-8');
  } catch {
    // 保存失败不影响使用，静默忽略
  }
}

function defaultPosition() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  return {
    x: workAreaSize.width - CARD_SIZE.width - 32,
    y: 48,
  };
}

/** 保存的位置是否仍落在某个显示器的工作区内（换屏/改分辨率后可能失效） */
function isBoundsOnScreen(x, y) {
  return screen.getAllDisplays().some(({ workArea }) => (
    x >= workArea.x &&
    y >= workArea.y &&
    x + CARD_SIZE.width <= workArea.x + workArea.width &&
    y + CARD_SIZE.height <= workArea.y + workArea.height
  ));
}

function createWindow() {
  const saved = loadSavedBounds();
  const position =
    saved && isBoundsOnScreen(saved.x, saved.y) ? saved : defaultPosition();

  win = new BrowserWindow({
    width: CARD_SIZE.width,
    height: CARD_SIZE.height,
    x: position.x,
    y: position.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    alwaysOnTop,
    skipTaskbar: true,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.on('moved', saveBounds);
  win.on('closed', () => {
    win = null;
  });

  // 右键菜单：切换置顶 / 退出
  win.webContents.on('context-menu', () => {
    if (!win) return;
    const menu = Menu.buildFromTemplate([
      {
        label: '始终置顶',
        type: 'checkbox',
        checked: alwaysOnTop,
        click: (item) => {
          alwaysOnTop = item.checked;
          win?.setAlwaysOnTop(alwaysOnTop);
        },
      },
      {
        label: '开机自启动',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked });
        },
      },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]);
    menu.popup();
  });
}

// 单实例锁：重复启动时不再开新窗口，而是把已有窗口带回前台
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
