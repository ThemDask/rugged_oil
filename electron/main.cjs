// Desktop wrapper (not wired up yet). Opens a window that loads the built game from dist/.
// To enable: `npm i -D electron electron-builder`, then add to package.json:
//   "main": "electron/main.cjs",
//   "scripts": { "electron:dev": "npm run build && electron .", "electron:build": "npm run build && electron-builder" }
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        backgroundColor: '#141416',
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true },
    });
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
