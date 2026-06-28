const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const isDev = !app.isPackaged;

// Resolve root paths — different in dev vs packaged
const ROOT       = isDev ? path.join(__dirname, '..') : __dirname;
const SERVER_SRC = path.join(ROOT, 'server', 'src');
const CLIENT_DIR = isDev
  ? path.join(ROOT, 'client', 'dist')
  : path.join(ROOT, 'client');

// ── Start Express server ──────────────────────────────────────────────────────
function startServer() {
  Object.assign(process.env, {
    PORT:              '4001',
    NODE_ENV:          'production',
    JWT_SECRET:        'indigo-desktop-secret-2026',
    ADMIN_USERNAME:    'admin',
    ADMIN_PASSWORD:    'indigo@2026',
    CLIENT_USERNAME:   'client',
    CLIENT_PASSWORD:   'client@2026',
  });

  const express = require('express');
  const apiApp  = require(path.join(SERVER_SRC, 'app'));
  const { loadData } = require(path.join(SERVER_SRC, 'utils', 'dataLoader'));

  const root = express();

  // 1. Serve built React static files
  root.use(express.static(CLIENT_DIR));

  // 2. Mount all /api/* routes from the Express API app
  root.use(apiApp);

  // 3. SPA fallback — any unmatched route gets index.html
  root.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });

  loadData();
  root.listen(4001, () => {
    console.log('IndiGo GWF Dashboard server running on http://localhost:4001');
  });
}

// ── Wait for server to accept connections before opening window ───────────────
function waitForServer(cb, tries = 0) {
  if (tries > 40) return cb(); // Fail open after ~12s
  const req = http.get('http://localhost:4001/api/health', res => {
    res.resume();
    cb();
  });
  req.on('error', () => setTimeout(() => waitForServer(cb, tries + 1), 300));
  req.end();
}

// ── Electron window ───────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration:  false,
    },
    title:           'IndiGo Giving Wings to Fly — Dashboard',
    backgroundColor: '#161616',
    show:            false,
  });

  win.maximize();
  win.loadURL('http://localhost:4001');
  win.once('ready-to-show', () => win.show());

  // Open any target="_blank" links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startServer();
  waitForServer(createWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
