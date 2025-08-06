export interface Recording {
    id: string;
    name: string;
    date: string;
    duration: string;
    size: string;
    path?: string;
}
export interface AppSettings {
    audioSource?: string;
    videoSource?: string;
    quality?: string;
    outputFormat?: string;
    autoSave?: boolean;
    theme?: 'light' | 'dark' | 'xbox';
}
export interface MediaConstraintsConfig {
    audio: boolean | MediaTrackConstraints;
    video: boolean | MediaTrackConstraints;
}
export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    startTime: number | null;
    duration: number;
}
export interface AudioVisualizerConfig {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    analyser: AnalyserNode;
    dataArray: Uint8Array;
    bufferLength: number;
}
export interface ProcessingSummary {
    title: string;
    duration: string;
    keyPoints: string[];
    actionItems: string[];
    participants: string[];
    timestamp: string;
}
export type InterfaceType = 'recording' | 'processing' | 'summary';
export interface DOMElements {
    minimizeBtn: HTMLButtonElement | null;
    maximizeBtn: HTMLButtonElement | null;
    closeBtn: HTMLButtonElement | null;
    recordBtn: HTMLButtonElement | null;
    pauseBtn: HTMLButtonElement | null;
    stopBtn: HTMLButtonElement | null;
    statusIndicator: HTMLElement | null;
    statusText: HTMLElement | null;
    recordingTimer: HTMLElement | null;
    audioSource: HTMLSelectElement | null;
    videoSource: HTMLSelectElement | null;
    quality: HTMLSelectElement | null;
    recordingInterface: HTMLElement | null;
    processingInterface: HTMLElement | null;
    summaryInterface: HTMLElement | null;
    audioCanvas: HTMLCanvasElement | null;
    newRecordingBtn: HTMLButtonElement | null;
    openFileBtn: HTMLButtonElement | null;
    recentRecordings: HTMLElement | null;
    clearRecordingsBtn: HTMLButtonElement | null;
    settingsModal: HTMLElement | null;
    settingsClose: HTMLButtonElement | null;
    settingsBtn: HTMLButtonElement | null;
    progressFill: HTMLElement | null;
    settingsPanel: HTMLElement | null;
    settingsHeader: HTMLElement | null;
    recentPanel: HTMLElement | null;
}
//# sourceMappingURL=app-types.d.ts.map