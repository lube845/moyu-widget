const { app, BrowserWindow, Menu, screen, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const BOUNDS_FILE = path.join(app.getPath('userData'), 'window-bounds.json');
const CARD_SIZE = { width: 280, height: 260 };

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

function createWindow() {
  const saved = loadSavedBounds();
  const position = saved ?? defaultPosition();

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
      preload: path.join(__dirname, 'preload.js'),
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

ipcMain.on('widget:close', () => {
  app.quit();
});

/**
 * 翻页时由 renderer 发来新的窗口高度。保持当前 x、width 不变;
 * 如果按当前 y 直接加高会超出屏幕工作区,则把 y 往上挪(以窗口底部为锚),
 * 避免新页面被屏幕底边切掉。
 */
ipcMain.on('widget:resize-height', (_event, rawHeight) => {
  if (!win) return;
  const height = Math.max(160, Math.min(800, Math.round(Number(rawHeight) || 0)));
  const bounds = win.getBounds();
  const { workArea } = screen.getDisplayMatching(bounds);
  const maxY = workArea.y + workArea.height - height;
  const nextY = Math.min(bounds.y, maxY);
  win.setBounds({ x: bounds.x, y: nextY, width: bounds.width, height });
  saveBounds();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
