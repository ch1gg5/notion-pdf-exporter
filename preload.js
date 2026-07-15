const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  validatePath: (path) => ipcRenderer.invoke('fs:validatePath', path),
  countHtmlFiles: (path) => ipcRenderer.invoke('fs:countHtmlFiles', path),
  startConversion: (source, output) => ipcRenderer.invoke('conversion:start', source, output),
  abortConversion: () => ipcRenderer.invoke('conversion:abort'),
  onProgress: (cb) => ipcRenderer.on('conversion:progress', (_, d) => cb(d)),
  onLog: (cb) => ipcRenderer.on('conversion:log', (_, m) => cb(m)),
  onError: (cb) => ipcRenderer.on('conversion:error', (_, m) => cb(m)),
  onDone: (cb) => ipcRenderer.on('conversion:done', (_, c) => cb(c)),
  removeAllListeners: () => {
    ['progress', 'log', 'error', 'done'].forEach(e => 
      ipcRenderer.removeAllListeners(`conversion:${e}`)
    );
  }
});