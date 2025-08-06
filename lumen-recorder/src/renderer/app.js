// Application state
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let isPaused = false;
let startTime = null;
let timerInterval = null;
let audioContext = null;
let analyser = null;
let audioCanvas = null;
let audioCanvasContext = null;
let animationId = null;

// DOM elements
const elements = {
    // Title bar controls
    minimizeBtn: document.getElementById('minimize-btn'),
    maximizeBtn: document.getElementById('maximize-btn'),
    closeBtn: document.getElementById('close-btn'),
    
    // Recording controls
    recordBtn: document.getElementById('record-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    stopBtn: document.getElementById('stop-btn'),
    
    // Status elements
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    recordingTimer: document.getElementById('recording-timer'),
    
    // Settings
    audioSource: document.getElementById('audio-source'),
    videoSource: document.getElementById('video-source'),
    quality: document.getElementById('quality'),
    
    // Interfaces
    recordingInterface: document.getElementById('recording-interface'),
    processingInterface: document.getElementById('processing-interface'),
    summaryInterface: document.getElementById('summary-interface'),
    
    // Audio visualizer
    audioCanvas: document.getElementById('audio-canvas'),
    
    // Sidebar
    newRecordingBtn: document.getElementById('new-recording-btn'),
    openFileBtn: document.getElementById('open-file-btn'),
    recentRecordings: document.getElementById('recent-recordings'),
    clearRecordingsBtn: document.getElementById('clear-recordings-btn'),
    
    // Settings modal
    settingsModal: document.getElementById('settings-modal'),
    settingsClose: document.getElementById('settings-close'),
    settingsBtn: document.getElementById('settings-btn'),
    
    // Progress
    progressFill: document.getElementById('progress-fill'),
    
    // Xbox-style interface elements
    settingsPanel: document.querySelector('.settings-panel'),
    settingsHeader: document.querySelector('.settings-header'),
    recentPanel: document.querySelector('.recent-panel')
};

// Initialize the application
function init() {
    setupEventListeners();
    setupAudioVisualizer();
    loadSettings();
    populateMediaDevices();
    loadRecentRecordings();
    
    // Set default timer
    if (elements.recordingTimer) {
        elements.recordingTimer.textContent = '00:00:00';
    }
    
    // Initialize Xbox-style interface
    initializeXboxInterface();
    
    console.log('Lumen Recorder initialized with Xbox-style interface');
}

// Initialize Xbox-style interface elements
function initializeXboxInterface() {
    // Set up settings panel as collapsed by default
    if (elements.settingsPanel) {
        elements.settingsPanel.classList.remove('expanded');
    }
    
    // Initialize tab system
    const firstTab = document.querySelector('.tab-btn');
    const firstPanel = document.querySelector('.tab-panel');
    if (firstTab && firstPanel) {
        firstTab.classList.add('active');
        firstPanel.classList.add('active');
    }
    
    // Add Xbox-style animations
    document.body.classList.add('xbox-initialized');
}

// Setup event listeners
function setupEventListeners() {
    // Title bar controls
    elements.minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });
    
    elements.maximizeBtn.addEventListener('click', () => {
        window.electronAPI.maximizeWindow();
    });
    
    elements.closeBtn.addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });
    
    // Recording controls
    elements.recordBtn.addEventListener('click', startRecording);
    elements.pauseBtn.addEventListener('click', togglePause);
    elements.stopBtn.addEventListener('click', stopRecording);
    
    // Sidebar buttons
    elements.newRecordingBtn.addEventListener('click', newRecording);
    elements.openFileBtn.addEventListener('click', openFile);
    
    // Settings modal
    elements.settingsClose.addEventListener('click', closeSettings);
    elements.settingsBtn.addEventListener('click', openSettings);
    
    // Clear recordings button
    if (elements.clearRecordingsBtn) {
        elements.clearRecordingsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all recordings?')) {
                elements.recentRecordings.innerHTML = `
                    <div class="empty-state">
                        <p>No recordings yet</p>
                        <p class="empty-state-subtitle">Start your first recording to see it here</p>
                    </div>
                `;
            }
        });
    }
    
    // Settings panel toggle
    if (elements.settingsHeader) {
        elements.settingsHeader.addEventListener('click', () => {
            elements.settingsPanel.classList.toggle('expanded');
        });
    }
    
    // Tab switching for settings modal
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remove active class from all tabs and panels
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Menu event listeners
    window.electronAPI.onMenuNewRecording(() => newRecording());
    window.electronAPI.onMenuStartRecording(() => startRecording());
    window.electronAPI.onMenuStopRecording(() => stopRecording());
    window.electronAPI.onMenuToggleRecording(() => togglePause());
    window.electronAPI.onMenuSettings(() => openSettings());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'r':
                event.preventDefault();
                if (!isRecording) startRecording();
                break;
            case 's':
                event.preventDefault();
                if (isRecording) stopRecording();
                break;
            case 'n':
                event.preventDefault();
                newRecording();
                break;
        }
    }
    
    if (event.key === ' ' && isRecording) {
        event.preventDefault();
        togglePause();
    }
}

// Setup audio visualizer
function setupAudioVisualizer() {
    audioCanvas = elements.audioCanvas;
    audioCanvasContext = audioCanvas.getContext('2d');
    
    // Set canvas size
    const rect = audioCanvas.getBoundingClientRect();
    audioCanvas.width = rect.width * window.devicePixelRatio;
    audioCanvas.height = rect.height * window.devicePixelRatio;
    audioCanvasContext.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// Start recording
async function startRecording() {
    try {
        const constraints = getMediaConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Setup audio context for visualization
        if (constraints.audio) {
            setupAudioAnalyser(stream);
        }
        
        // Setup media recorder
        const options = {
            mimeType: 'video/webm;codecs=vp9,opus'
        };
        
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = handleRecordingStop;
        
        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        isRecording = true;
        isPaused = false;
        startTime = Date.now();
        
        // Update UI
        updateRecordingState('recording');
        startTimer();
        startAudioVisualization();
        
        // Notify main process
        window.electronAPI.setRecordingState(true);
        
    } catch (error) {
        console.error('Error starting recording:', error);
        window.electronAPI.showErrorDialog('Recording Error', 
            'Failed to start recording. Please check your microphone and camera permissions.');
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        
        // Stop all tracks
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        isRecording = false;
        isPaused = false;
        
        // Update UI
        updateRecordingState('stopped');
        stopTimer();
        stopAudioVisualization();
        
        // Notify main process
        window.electronAPI.setRecordingState(false);
    }
}

// Toggle pause/resume
function togglePause() {
    if (!isRecording) return;
    
    if (isPaused) {
        mediaRecorder.resume();
        isPaused = false;
        updateRecordingState('recording');
        startTimer();
    } else {
        mediaRecorder.pause();
        isPaused = true;
        updateRecordingState('paused');
        stopTimer();
    }
}

// Handle recording stop
async function handleRecordingStop() {
    if (recordedChunks.length === 0) {
        window.electronAPI.showErrorDialog('Recording Error', 'No data was recorded.');
        return;
    }
    
    // Show processing interface
    showInterface('processing');
    
    // Simulate processing with progress
    await simulateProcessing();
    
    // Create blob from recorded chunks
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    // Save recording
    const filePath = await window.electronAPI.saveRecording(blob);
    
    if (filePath) {
        // Add to recent recordings
        addToRecentRecordings({
            name: `Recording ${new Date().toLocaleString()}`,
            path: filePath,
            duration: formatTime(Math.floor((Date.now() - startTime) / 1000)),
            date: new Date().toISOString()
        });
        
        // Generate mock summary
        const summary = generateMockSummary();
        showSummary(summary);
    } else {
        // User cancelled save, go back to recording interface
        showInterface('recording');
    }
}

// Get media constraints based on settings
function getMediaConstraints() {
    const videoSource = elements.videoSource.value;
    const quality = elements.quality.value;
    
    const constraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    };
    
    if (videoSource !== 'audio-only') {
        const videoConstraints = {
            width: { ideal: quality === 'high' ? 1920 : quality === 'medium' ? 1280 : 854 },
            height: { ideal: quality === 'high' ? 1080 : quality === 'medium' ? 720 : 480 },
            frameRate: { ideal: 30 }
        };
        
        if (videoSource === 'screen') {
            constraints.video = {
                ...videoConstraints,
                mediaSource: 'screen'
            };
        } else {
            constraints.video = videoConstraints;
        }
    }
    
    return constraints;
}

// Setup audio analyser for visualization
function setupAudioAnalyser(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
}

// Start audio visualization
function startAudioVisualization() {
    if (!analyser) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        if (!isRecording) return;
        
        animationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        const canvas = audioCanvas;
        const ctx = audioCanvasContext;
        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        const barWidth = width / bufferLength * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height * 0.8;
            
            const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    draw();
}

// Stop audio visualization
function stopAudioVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    // Clear canvas
    if (audioCanvasContext) {
        const width = audioCanvas.width / window.devicePixelRatio;
        const height = audioCanvas.height / window.devicePixelRatio;
        audioCanvasContext.clearRect(0, 0, width, height);
    }
}

// Update recording state UI
function updateRecordingState(state) {
    const statusDot = elements.statusIndicator?.querySelector('.status-dot');
    const statusText = elements.statusText;
    
    // Remove existing state classes
    if (statusDot) {
        statusDot.classList.remove('recording', 'paused', 'stopped');
    }
    
    switch (state) {
        case 'recording':
            if (statusDot) statusDot.classList.add('recording');
            if (statusText) statusText.textContent = 'Recording';
            if (elements.recordBtn) elements.recordBtn.disabled = true;
            if (elements.pauseBtn) elements.pauseBtn.disabled = false;
            if (elements.stopBtn) elements.stopBtn.disabled = false;
            
            // Update Xbox-style button icons
            if (elements.pauseBtn) {
                elements.pauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                elements.pauseBtn.title = 'Pause Recording';
            }
            break;
        case 'paused':
            if (statusDot) statusDot.classList.add('paused');
            if (statusText) statusText.textContent = 'Paused';
            
            // Update Xbox-style button icons
            if (elements.pauseBtn) {
                elements.pauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>';
                elements.pauseBtn.title = 'Resume Recording';
            }
            break;
        case 'stopped':
        default:
            if (statusDot) statusDot.classList.add('stopped');
            if (statusText) statusText.textContent = 'Ready to Record';
            if (elements.recordBtn) elements.recordBtn.disabled = false;
            if (elements.pauseBtn) elements.pauseBtn.disabled = true;
            if (elements.stopBtn) elements.stopBtn.disabled = true;
            
            // Reset Xbox-style button icons
            if (elements.recordBtn) {
                elements.recordBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
                elements.recordBtn.title = 'Start Recording';
            }
            if (elements.pauseBtn) {
                elements.pauseBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                elements.pauseBtn.title = 'Pause Recording';
            }
            if (elements.stopBtn) {
                elements.stopBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg>';
                elements.stopBtn.title = 'Stop Recording';
            }
            break;
    }
}

// Timer functions
function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    elements.recordingTimer.textContent = formatTime(elapsed);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Interface management
function showInterface(interfaceName) {
    elements.recordingInterface.classList.add('hidden');
    elements.processingInterface.classList.add('hidden');
    elements.summaryInterface.classList.add('hidden');
    
    switch (interfaceName) {
        case 'recording':
            elements.recordingInterface.classList.remove('hidden');
            break;
        case 'processing':
            elements.processingInterface.classList.remove('hidden');
            break;
        case 'summary':
            elements.summaryInterface.classList.remove('hidden');
            break;
    }
}

// Simulate processing with progress
async function simulateProcessing() {
    const progressFill = elements.progressFill;
    let progress = 0;
    
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(resolve, 500);
            }
            progressFill.style.width = `${progress}%`;
        }, 200);
    });
}

// Generate mock summary
function generateMockSummary() {
    return {
        keyPoints: [
            'Meeting started with introductions and agenda review',
            'Discussed project timeline and key milestones',
            'Identified potential risks and mitigation strategies',
            'Assigned action items to team members',
            'Scheduled follow-up meeting for next week'
        ],
        transcript: `This is a sample transcript of the recorded session. In a real implementation, this would be generated using speech-to-text services like Google Speech-to-Text, Azure Speech Services, or AWS Transcribe.

The transcript would contain the actual spoken content from the recording, with timestamps and speaker identification where possible.

Key features would include:
- Automatic punctuation
- Speaker diarization
- Confidence scores
- Custom vocabulary support`
    };
}

// Show summary interface
function showSummary(summary) {
    const keyPointsElement = document.getElementById('key-points');
    const transcriptElement = document.getElementById('transcript');
    
    // Populate key points
    keyPointsElement.innerHTML = summary.keyPoints
        .map(point => `<div class="key-point">• ${point}</div>`)
        .join('');
    
    // Populate transcript
    transcriptElement.textContent = summary.transcript;
    
    showInterface('summary');
}

// Recent recordings management
function loadRecentRecordings() {
    // In a real app, this would load from electron-store
    const recentRecordings = [];
    updateRecentRecordingsList(recentRecordings);
}

function addToRecentRecordings(recording) {
    // In a real app, this would save to electron-store
    console.log('Added recording:', recording);
    
    // Update the UI
    const recentRecordings = [recording]; // In real app, get from store
    updateRecentRecordingsList(recentRecordings);
}

function updateRecentRecordingsList(recordings) {
    const container = elements.recentRecordings;
    
    if (recordings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No recordings yet</p>
                <p class="empty-state-subtitle">Start your first recording to see it here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recordings
        .map(recording => `
            <div class="recent-recording-item">
                <div class="recording-info">
                    <div class="recording-name">${recording.name}</div>
                    <div class="recording-meta">${recording.duration} • ${new Date(recording.date).toLocaleDateString()}</div>
                </div>
            </div>
        `)
        .join('');
}

// Settings management
function loadSettings() {
    // Load settings from electron-store
    // This is a placeholder - in real app, load actual settings
}

function openSettings() {
    elements.settingsModal.classList.remove('hidden');
}

function closeSettings() {
    elements.settingsModal.classList.add('hidden');
}

// Media devices
async function populateMediaDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        const audioSelect = elements.audioSource;
        audioSelect.innerHTML = '';
        
        audioDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${audioSelect.children.length + 1}`;
            audioSelect.appendChild(option);
        });
        
        if (audioDevices.length === 0) {
            const option = document.createElement('option');
            option.value = 'default';
            option.textContent = 'Default Microphone';
            audioSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error enumerating devices:', error);
    }
}

// Utility functions
function newRecording() {
    if (isRecording) {
        stopRecording();
    }
    showInterface('recording');
    elements.recordingTimer.textContent = '00:00:00';
    updateRecordingState('stopped');
}

function openFile() {
    // This would be handled by the main process
    console.log('Open file requested');
}

// Initialize the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}