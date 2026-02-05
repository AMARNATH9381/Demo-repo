const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, desktopCapturer, session, globalShortcut } = require('electron');
const path = require('path');
const { fork } = require('child_process');

console.log('Starting Electron Main Process...');


// Set DB Path logic moved to app.on('ready') to prevent crash if app is undefined
// if (app.isPackaged) { ... }

let backendProcess;

function startBackend() {
    const backendPath = path.join(__dirname, '../backend/server.js');
    console.log('Starting backend from:', backendPath);

    // Use fork instead of spawn. 
    // fork uses the same executable (Electron) to run the script, ensuring
    // native modules like sqlite3 are compatible and no external 'node' is needed.
    backendProcess = fork(backendPath, [], {
        env: { ...process.env, PORT: 3001, DB_PATH: process.env.DB_PATH },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    backendProcess.on('error', (err) => {
        console.error('Backend process failed to start:', err);
    });

    backendProcess.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
    });
}

let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        skipTaskbar: true, // Hide from taskbar
    });

    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // mainWindow.webContents.openDevTools(); // Disabled for stealth/cleanliness
    } else {
        mainWindow.loadURL(startUrl);
    }

    // Apply content protection when ready to ensure it takes effect
    mainWindow.once('ready-to-show', () => {
        mainWindow.setContentProtection(true);
    });

    mainWindow.on('close', function (event) {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', () => {
    // Set DB Path now that app is ready
    if (app.isPackaged) {
        process.env.DB_PATH = path.join(app.getPath('userData'), 'meeting_pilot.db');
    } else {
        process.env.DB_PATH = path.join(__dirname, '../backend/meeting_pilot.db');
    }

    startBackend();
    createWindow();

    // Enable screen sharing with AUTO-SELECT (No UI Picker)
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } }).then((sources) => {
            if (sources.length > 0) {
                // Automatically select the first screen (usually "Entire Screen" or "Screen 1")
                callback({ video: sources[0], audio: 'loopback' });
            } else {
                // No sources found
                callback(null);
            }
        }).catch(err => {
            console.error("Error getting sources:", err);
            callback(null);
        });
    });

    /* COMMENTED OUT MANUAL PICKER FOR AUTO-SELECTION
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 150, height: 150 } }).then((sources) => {
            // Send sources to the renderer to show a UI
            mainWindow.webContents.send('show-screen-picker', sources);

            // Listen for the user's selection from the UI
            ipcMain.once('screen-picker-selected', (event, sourceId) => {
                if (sourceId) {
                    const source = sources.find((s) => s.id === sourceId);
                    callback({ video: source, audio: 'loopback' });
                } else {
                    // User cancelled
                    callback(null);
                }
            });
        });
    });
    */

    // Overlay Window Logic
    let overlayWindow = null;

    function createOverlayWindow() {
        if (overlayWindow) return;

        overlayWindow = new BrowserWindow({
            width: 400,
            height: 600,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            }
        });

        // HIDDEN FROM SCREEN CAPTURE
        overlayWindow.setContentProtection(true);
        // Visible on all virtual desktops
        overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        // Ensure it stays on top even more aggressively
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');

        const startUrl = process.env.ELECTRON_START_URL
            ? `${process.env.ELECTRON_START_URL}?overlay=true`
            : `file://${path.join(__dirname, '../dist/index.html')}?overlay=true`;

        if (!app.isPackaged) {
            overlayWindow.loadURL('http://localhost:3000?overlay=true');
        } else {
            overlayWindow.loadURL(startUrl);
        }

        overlayWindow.on('closed', () => {
            overlayWindow = null;
        });
    }

    ipcMain.on('toggle-overlay', () => {
        if (overlayWindow) {
            if (overlayWindow.isVisible()) {
                overlayWindow.hide();
            } else {
                overlayWindow.show();
            }
        } else {
            createOverlayWindow();
        }
    });

    ipcMain.on('update-overlay-data', (event, data) => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('update-overlay-data', data);
        }
    });

    ipcMain.on('overlay-ready', () => {
        // Could request initial state here if needed
    });

    // Forward overlay commands to main window
    ipcMain.on('overlay-start-session', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('overlay-command', { action: 'start' });
        }
    });

    ipcMain.on('overlay-stop-session', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('overlay-command', { action: 'stop' });
        }
    });

    // Tray Implementation
    // Create a 1x1 pixel transparent icon as a fallback/stealth icon
    const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.setContentProtection(true); // Re-apply to be safe
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Quit Pilot',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.setContentProtection(true); // Re-apply to be safe
                mainWindow.focus();
            }
        }
    });
});

app.on('window-all-closed', function () {
    // Do not quit when windows are closed, unless explicit quit
    if (process.platform !== 'darwin' && isQuitting) {
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
    // Unregister shortcuts not that we have any
    globalShortcut.unregisterAll();
});
