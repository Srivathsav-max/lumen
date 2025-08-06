const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // File operations
  saveRecording: (recordingData) => ipcRenderer.invoke('save-recording', recordingData),
  
  // Settings
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // Dialogs
  showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
  showInfoDialog: (title, content) => ipcRenderer.invoke('show-info-dialog', title, content),
  
  // Recording state
  setRecordingState: (isRecording) => ipcRenderer.send('recording-state-changed', isRecording),
  
  // Menu event listeners
  onMenuNewRecording: (callback) => ipcRenderer.on('menu-new-recording', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuSettings: (callback) => ipcRenderer.on('menu-settings', callback),
  onMenuStartRecording: (callback) => ipcRenderer.on('menu-start-recording', callback),
  onMenuStopRecording: (callback) => ipcRenderer.on('menu-stop-recording', callback),
  onMenuToggleRecording: (callback) => ipcRenderer.on('menu-toggle-recording', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});