import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ElectronAPI } from './types/electron-api';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Window controls
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('maximize-window'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('close-window'),
  
  // App info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  
  // File operations
  saveRecording: (recordingData: Blob): Promise<string | null> => 
    ipcRenderer.invoke('save-recording', recordingData),
  
  // Settings
  getSetting: (key: string): Promise<any> => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: any): Promise<void> => 
    ipcRenderer.invoke('set-setting', key, value),
  
  // Dialogs
  showErrorDialog: (title: string, content: string): Promise<void> => 
    ipcRenderer.invoke('show-error-dialog', title, content),
  showInfoDialog: (title: string, content: string): Promise<number> => 
    ipcRenderer.invoke('show-info-dialog', title, content),
  
  // Recording state
  setRecordingState: (isRecording: boolean): void => 
    ipcRenderer.send('recording-state-changed', isRecording),
  
  // Menu event listeners
  onMenuNewRecording: (callback: () => void): void => {
    ipcRenderer.on('menu-new-recording', callback);
  },
  onMenuOpenFile: (callback: (event: IpcRendererEvent, filePath: string) => void): void => {
    ipcRenderer.on('menu-open-file', callback);
  },
  onMenuSettings: (callback: () => void): void => {
    ipcRenderer.on('menu-settings', callback);
  },
  onMenuStartRecording: (callback: () => void): void => {
    ipcRenderer.on('menu-start-recording', callback);
  },
  onMenuStopRecording: (callback: () => void): void => {
    ipcRenderer.on('menu-stop-recording', callback);
  },
  onMenuToggleRecording: (callback: () => void): void => {
    ipcRenderer.on('menu-toggle-recording', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
