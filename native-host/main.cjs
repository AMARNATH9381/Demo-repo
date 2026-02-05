const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Debugging: Ensure we are in Electron
if (!app) {
    console.error('FATAL: app is undefined. Running with Node instead of Electron?');
    // This happens if you run `node electron/main.js` instead of `electron .`
    process.exit(1);
}

// Set DB Path before importing backend
if (app.isPackaged) {
    process.env.DB_PATH = path.join(app.getPath('userData'), 'meeting_pilot.db');
} else {
    process.env.DB_PATH = path.join(__dirname, '../backend/meeting_pilot.db');
}

let backendProcess;

function startBackend() {
    const backendPath = path.join(__dirname, '../backend/server.js');
    console.log('Starting backend from:', backendPath);

    // Spawn backend. Use 'node' command.
    backendProcess = spawn('node', [backendPath], {
        env: { ...process.env, PORT: 3001, DB_PATH: process.env.DB_PATH },
        stdio: 'inherit'
    });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL(startUrl);
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', () => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', function () {
    // On Windows, quit when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('will-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
