export interface ElectronAPI {
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    getAppVersion: () => Promise<string>;
    saveRecording: (recordingData: Blob) => Promise<string | null>;
    getSetting: (key: string) => Promise<any>;
    setSetting: (key: string, value: any) => Promise<void>;
    showErrorDialog: (title: string, content: string) => Promise<void>;
    showInfoDialog: (title: string, content: string) => Promise<number>;
    setRecordingState: (isRecording: boolean) => void;
    onMenuNewRecording: (callback: () => void) => void;
    onMenuOpenFile: (callback: (event: any, filePath: string) => void) => void;
    onMenuSettings: (callback: () => void) => void;
    onMenuStartRecording: (callback: () => void) => void;
    onMenuStopRecording: (callback: () => void) => void;
    onMenuToggleRecording: (callback: () => void) => void;
    removeAllListeners: (channel: string) => void;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
export {};
//# sourceMappingURL=electron-api.d.ts.map