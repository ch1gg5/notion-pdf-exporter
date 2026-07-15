const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let mainWindow;
let conversionProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 820,
    minWidth: 600,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#F7F6F3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:validatePath', (_, folderPath) => {
  try {
    const stats = fs.statSync(folderPath);
    return { valid: stats.isDirectory() };
  } catch {
    return { valid: false };
  }
});

ipcMain.handle('fs:countHtmlFiles', (_, folderPath) => {
  let count = 0;
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) count++;
    }
  }
  walk(folderPath);
  return count;
});

ipcMain.handle('conversion:start', async (_, sourceDir, outputDir) => {
  if (conversionProcess) conversionProcess.kill();
  
  const scriptPath = path.join(__dirname, 'convert.js');
  
  // Use fork - it uses the same Node runtime as Electron
  conversionProcess = fork(scriptPath, [sourceDir, outputDir], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: process.env
  });

  conversionProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        mainWindow.webContents.send('conversion:progress', parsed);
      } catch {
        mainWindow.webContents.send('conversion:log', line);
      }
    }
  });

  conversionProcess.stderr.on('data', (data) => {
    mainWindow.webContents.send('conversion:error', data.toString());
  });

  conversionProcess.on('close', (code) => {
    mainWindow.webContents.send('conversion:done', code);
    conversionProcess = null;
  });

  return { pid: conversionProcess.pid };
});

ipcMain.handle('conversion:abort', () => {
  if (conversionProcess) {
    conversionProcess.kill();
    conversionProcess = null;
    return true;
  }
  return false;
});