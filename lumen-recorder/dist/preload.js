"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => electron_1.ipcRenderer.invoke('maximize-window'),
    closeWindow: () => electron_1.ipcRenderer.invoke('close-window'),
    // App info
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    // File operations
    saveRecording: (recordingData) => electron_1.ipcRenderer.invoke('save-recording', recordingData),
    // Settings
    getSetting: (key) => electron_1.ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke('set-setting', key, value),
    // Dialogs
    showErrorDialog: (title, content) => electron_1.ipcRenderer.invoke('show-error-dialog', title, content),
    showInfoDialog: (title, content) => electron_1.ipcRenderer.invoke('show-info-dialog', title, content),
    // Recording state
    setRecordingState: (isRecording) => electron_1.ipcRenderer.send('recording-state-changed', isRecording),
    // Menu event listeners
    onMenuNewRecording: (callback) => {
        electron_1.ipcRenderer.on('menu-new-recording', callback);
    },
    onMenuOpenFile: (callback) => {
        electron_1.ipcRenderer.on('menu-open-file', callback);
    },
    onMenuSettings: (callback) => {
        electron_1.ipcRenderer.on('menu-settings', callback);
    },
    onMenuStartRecording: (callback) => {
        electron_1.ipcRenderer.on('menu-start-recording', callback);
    },
    onMenuStopRecording: (callback) => {
        electron_1.ipcRenderer.on('menu-stop-recording', callback);
    },
    onMenuToggleRecording: (callback) => {
        electron_1.ipcRenderer.on('menu-toggle-recording', callback);
    },
    // Remove listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    }
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map