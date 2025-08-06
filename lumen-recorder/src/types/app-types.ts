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
  // Title bar controls
  minimizeBtn: HTMLButtonElement | null;
  maximizeBtn: HTMLButtonElement | null;
  closeBtn: HTMLButtonElement | null;
  
  // Recording controls
  recordBtn: HTMLButtonElement | null;
  pauseBtn: HTMLButtonElement | null;
  stopBtn: HTMLButtonElement | null;
  
  // Status elements
  statusIndicator: HTMLElement | null;
  statusText: HTMLElement | null;
  recordingTimer: HTMLElement | null;
  
  // Settings
  audioSource: HTMLSelectElement | null;
  videoSource: HTMLSelectElement | null;
  quality: HTMLSelectElement | null;
  
  // Interfaces
  recordingInterface: HTMLElement | null;
  processingInterface: HTMLElement | null;
  summaryInterface: HTMLElement | null;
  
  // Audio visualizer
  audioCanvas: HTMLCanvasElement | null;
  
  // Sidebar
  newRecordingBtn: HTMLButtonElement | null;
  openFileBtn: HTMLButtonElement | null;
  recentRecordings: HTMLElement | null;
  clearRecordingsBtn: HTMLButtonElement | null;
  
  // Settings modal
  settingsModal: HTMLElement | null;
  settingsClose: HTMLButtonElement | null;
  settingsBtn: HTMLButtonElement | null;
  
  // Progress
  progressFill: HTMLElement | null;
  
  // Xbox-style interface elements
  settingsPanel: HTMLElement | null;
  settingsHeader: HTMLElement | null;
  recentPanel: HTMLElement | null;
}
