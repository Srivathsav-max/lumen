"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const electron_store_1 = __importDefault(require("electron-store"));
// Initialize electron store for settings
const store = new electron_store_1.default();
let mainWindow = null;
let isRecording = false;
function createWindow() {
    // Create the browser window with transparent background
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        transparent: true,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false
    });
    // Load the app
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Development tools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}
// App event listeners
electron_1.app.whenReady().then(() => {
    createWindow();
    createMenu();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Recording',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('menu-new-recording');
                        }
                    }
                },
                {
                    label: 'Open Recording',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        if (!mainWindow)
                            return;
                        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a'] },
                                { name: 'Video Files', extensions: ['mp4', 'webm', 'mov'] }
                            ]
                        });
                        if (!result.canceled) {
                            mainWindow.webContents.send('menu-open-file', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('menu-settings');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        electron_1.app.quit();
                    }
                }
            ]
        },
        {
            label: 'Recording',
            submenu: [
                {
                    label: 'Start Recording',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('menu-start-recording');
                        }
                    }
                },
                {
                    label: 'Stop Recording',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('menu-stop-recording');
                        }
                    }
                },
                {
                    label: 'Pause/Resume',
                    accelerator: 'Space',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('menu-toggle-recording');
                        }
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Fullscreen',
                    accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.setFullScreen(!mainWindow.isFullScreen());
                        }
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                }
            ]
        }
    ];
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
// IPC handlers
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});
electron_1.ipcMain.handle('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow.maximize();
        }
    }
});
electron_1.ipcMain.handle('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});
electron_1.ipcMain.handle('save-recording', async (event, recordingData) => {
    if (!mainWindow)
        return null;
    const result = await electron_1.dialog.showSaveDialog(mainWindow, {
        defaultPath: `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`,
        filters: [
            { name: 'WebM Video', extensions: ['webm'] },
            { name: 'MP4 Video', extensions: ['mp4'] }
        ]
    });
    if (!result.canceled) {
        return result.filePath || null;
    }
    return null;
});
electron_1.ipcMain.handle('get-setting', (event, key) => {
    return store.get(key);
});
electron_1.ipcMain.handle('set-setting', (event, key, value) => {
    store.set(key, value);
});
electron_1.ipcMain.handle('show-error-dialog', (event, title, content) => {
    electron_1.dialog.showErrorBox(title, content);
});
electron_1.ipcMain.handle('show-info-dialog', async (event, title, content) => {
    if (!mainWindow)
        return 0;
    const result = await electron_1.dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: title,
        message: content,
        buttons: ['OK']
    });
    return result.response;
});
// Handle recording state
electron_1.ipcMain.on('recording-state-changed', (event, recording) => {
    isRecording = recording;
});
//# sourceMappingURL=main.js.map