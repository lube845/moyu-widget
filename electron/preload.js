const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  close: () => ipcRenderer.send('widget:close'),
  // 翻页时让窗口跟着变高度,确保新页能完整显示
  resizeHeight: (height) => ipcRenderer.send('widget:resize-height', height),
});
