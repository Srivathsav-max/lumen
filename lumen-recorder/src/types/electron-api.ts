export interface ElectronAPI {
  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // App info
  getAppVersion: () => Promise<string>;
  
  // File operations
  saveRecording: (recordingData: Blob) => Promise<string | null>;
  
  // Settings
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<void>;
  
  // Dialogs
  showErrorDialog: (title: string, content: string) => Promise<void>;
  showInfoDialog: (title: string, content: string) => Promise<number>;
  
  // Recording state
  setRecordingState: (isRecording: boolean) => void;
  
  // Menu event listeners
  onMenuNewRecording: (callback: () => void) => void;
  onMenuOpenFile: (callback: (event: any, filePath: string) => void) => void;
  onMenuSettings: (callback: () => void) => void;
  onMenuStartRecording: (callback: () => void) => void;
  onMenuStopRecording: (callback: () => void) => void;
  onMenuToggleRecording: (callback: () => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
