# Lumen Recorder

A modern desktop recording application built with Electron for recording meetings, classes, and presentations with AI-powered summaries.

## Features

- 🎥 **Screen & Audio Recording**: Record your screen, microphone, or both
- 🎨 **Modern Dark UI**: Transparent background with sleek dark theme
- 📊 **Real-time Audio Visualization**: Visual feedback during recording
- ⏱️ **Recording Timer**: Track recording duration in real-time
- 🎛️ **Flexible Controls**: Start, pause, resume, and stop recordings
- 💾 **Auto-save**: Automatically save recordings to your preferred location
- 📝 **AI Summaries**: Generate summaries and transcripts (coming soon)
- ⌨️ **Keyboard Shortcuts**: Quick access to all recording functions
- 🔧 **Customizable Settings**: Configure recording quality and preferences

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Navigate to the lumen-recorder directory:
   ```bash
   cd lumen-recorder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Usage

### Recording

1. **Start Recording**: Click the "Start Recording" button or press `Ctrl+R`
2. **Pause/Resume**: Click "Pause" or press `Space` during recording
3. **Stop Recording**: Click "Stop" or press `Ctrl+S`
4. **Save**: Choose where to save your recording when prompted

### Settings

- **Audio Source**: Select your preferred microphone
- **Video Source**: Choose between screen recording, camera, or both
- **Quality**: Set recording quality (High/Medium/Low)
- **Auto-save**: Enable automatic saving of recordings

### Keyboard Shortcuts

- `Ctrl+R` - Start recording
- `Ctrl+S` - Stop recording
- `Space` - Pause/Resume (during recording)
- `Ctrl+N` - New recording
- `Ctrl+O` - Open file
- `Ctrl+,` - Open settings
- `F11` - Toggle fullscreen

## File Structure

```
lumen-recorder/
├── src/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for secure IPC
│   └── renderer/
│       ├── index.html   # Main UI
│       ├── styles.css   # Styling
│       └── app.js       # Renderer logic
├── assets/              # Application icons
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Development

### Running in Development

```bash
npm run dev
```

This starts the application with developer tools enabled.

### Building for Distribution

```bash
npm run dist
```

This creates distributable packages for your platform in the `dist/` directory.

### Supported Platforms

- Windows (NSIS installer)
- macOS (DMG)
- Linux (AppImage)

## Technical Details

### Technologies Used

- **Electron**: Cross-platform desktop framework
- **MediaRecorder API**: Native browser recording capabilities
- **Web Audio API**: Real-time audio visualization
- **Canvas API**: Audio waveform rendering
- **CSS Grid/Flexbox**: Responsive layout

### Recording Formats

- **Video**: WebM (VP9 codec preferred)
- **Audio**: Opus codec
- **Fallback**: WebM with default codecs

### Security Features

- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script
- No remote module access

## Upcoming Features

- 🤖 **AI-Powered Transcription**: Automatic speech-to-text
- 📊 **Meeting Analytics**: Speaker time, engagement metrics
- ☁️ **Cloud Integration**: Save to cloud storage services
- 🔗 **Backend Integration**: Connect with Lumen platform
- 📱 **Mobile Companion**: Remote control via mobile app
- 🎯 **Smart Highlights**: Automatic key moment detection
- 📤 **Export Options**: Multiple format support
- 🔄 **Live Streaming**: Stream directly to platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Note**: This is a native desktop application, not a web wrapper. It provides full access to system APIs for high-quality recording and processing capabilities.