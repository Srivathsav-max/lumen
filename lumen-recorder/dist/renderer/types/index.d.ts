export interface ElectronAPI {
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    getAppVersion: () => Promise<string>;
    saveRecording: (buffer: Buffer, filename: string) => Promise<void>;
    getSetting: (key: string) => Promise<any>;
    setSetting: (key: string, value: any) => Promise<void>;
    showErrorDialog: (title: string, message: string) => Promise<void>;
    showInfoDialog: (title: string, message: string) => Promise<void>;
    showOpenDialog: () => Promise<any>;
    setRecordingState: (isRecording: boolean) => void;
    onMenuNewRecording: (callback: () => void) => void;
    onMenuOpenFile: (callback: () => void) => void;
    onMenuSettings: (callback: () => void) => void;
    onMenuStartRecording: (callback: () => void) => void;
    onMenuStopRecording: (callback: () => void) => void;
    onMenuToggleRecording: (callback: () => void) => void;
    removeAllListeners: (channel: string) => void;
}
export interface RecordingSettings {
    audioSource: string;
    videoSource: 'screen' | 'camera' | 'both' | 'audio-only';
    quality: 'high' | 'medium' | 'low';
    autoSave: boolean;
    saveLocation: string;
    autoSummary: boolean;
    summaryLanguage: string;
}
export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    startTime: number | null;
    duration: number;
    status: 'idle' | 'recording' | 'paused' | 'processing' | 'completed';
}
export interface MediaConstraints {
    audio: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
}
declare global {
    interface MediaTrackConstraints {
        deviceId?: string | {
            exact: string;
        } | {
            ideal: string;
        };
        groupId?: string | {
            exact: string;
        } | {
            ideal: string;
        };
        sampleRate?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        sampleSize?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        echoCancellation?: boolean | {
            exact: boolean;
        } | {
            ideal: boolean;
        };
        autoGainControl?: boolean | {
            exact: boolean;
        } | {
            ideal: boolean;
        };
        noiseSuppression?: boolean | {
            exact: boolean;
        } | {
            ideal: boolean;
        };
        latency?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        channelCount?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        width?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        height?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        frameRate?: number | {
            exact: number;
        } | {
            ideal: number;
        } | {
            min: number;
        } | {
            max: number;
        };
        facingMode?: string | {
            exact: string;
        } | {
            ideal: string;
        };
        resizeMode?: string | {
            exact: string;
        } | {
            ideal: string;
        };
    }
}
export interface RecordingData {
    id?: string;
    name?: string;
    blob: Blob;
    duration: number;
    timestamp: Date;
    size?: number;
    format?: string;
    settings: RecordingSettings;
}
export interface Summary {
    keyPoints: string[];
    transcript: string;
    speakers?: Speaker[];
    topics?: Topic[];
    actionItems?: ActionItem[];
    duration?: number;
    timestamp?: Date;
}
export interface Speaker {
    id: string;
    name: string;
    speakingTime: number;
    segments: SpeechSegment[];
}
export interface SpeechSegment {
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
}
export interface Topic {
    name: string;
    relevance: number;
    mentions: number;
    timeRanges: TimeRange[];
}
export interface ActionItem {
    task: string;
    assignee: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
}
export interface TimeRange {
    start: number;
    end: number;
}
export interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    children: string;
    onClick?: () => void;
    className?: string;
}
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}
export interface ProgressBarProps {
    value: number;
    max?: number;
    className?: string;
    showLabel?: boolean;
}
export interface AudioVisualizerProps {
    analyser: any | null;
    isActive: boolean;
    className?: string;
}
export interface AudioVisualizerState {
    analyser: any | null;
    dataArray: Uint8Array | null;
    canvas: any | null;
    canvasContext: any | null;
    animationId: number | null;
}
export interface AppState {
    recording: RecordingState;
    settings: RecordingSettings;
    recentRecordings: RecordingData[];
    currentInterface: 'recording' | 'processing' | 'summary';
    isSettingsOpen: boolean;
}
export interface RecordingEvent {
    type: 'start' | 'pause' | 'resume' | 'stop' | 'error';
    timestamp: number;
    data?: any;
}
export interface RecordingError {
    code: string;
    message: string;
    details?: any;
}
export type RecordingStatus = RecordingState['status'];
export type VideoSource = RecordingSettings['videoSource'];
export type Quality = RecordingSettings['quality'];
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
//# sourceMappingURL=index.d.ts.map