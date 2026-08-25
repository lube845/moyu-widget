const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  close: () => ipcRenderer.send('widget:close'),
});
