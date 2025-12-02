# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
Audio recording and transcription application for macOS that captures system audio and microphone input, with automatic transcription using OpenAI Whisper API. Supports multiple sources: microphone, Zoom meetings (via ZoomAudioDevice), Teams meetings, and system audio via BlackHole virtual driver.

## Architecture

### Three-tier Architecture with Real-time Communication
- **Backend (Node.js/Express - Port 5001)**: Express server with Socket.IO for real-time communication, FFmpeg integration for audio capture
- **Frontend (React/TypeScript - Port 3000)**: Single-page application with real-time audio visualization and recording management
- **Desktop (Electron)**: Native macOS application wrapper with system tray integration

### Key Components
- `backend/server.js` - Main server with Socket.IO WebSocket handling, FFmpeg audio capture, and Whisper API integration
- `backend/audio-devices.js` - Intelligent audio device detection and selection with priority system
- `backend/audio-splitter.js` - Splits large audio files (>24MB) into 3-minute chunks for Whisper API processing
- `frontend/src/App.tsx` - Main React component with recording controls and file management
- `frontend/src/components/AudioVisualizer.tsx` - Real-time audio waveform visualization using Canvas API
- `electron-main.js` - Electron main process with tray icon and native menu integration

## Commands

### Installation & Setup
```bash
npm run install-all          # Install all dependencies (root, backend, frontend)
./setup.sh                   # Complete setup script with dependency verification
```

### Development
```bash
npm run dev                  # Start all components in development mode (backend, frontend, electron)
npm run dev-backend          # Backend only with nodemon auto-reload (port 5001)
npm run dev-frontend         # Frontend only with React hot-reload (port 3000)
./start-app.sh              # Quick launcher script with environment checks
```

### Production
```bash
npm run start                # Start Electron app in production mode
npm run start-backend        # Backend server in production mode
npm run start-frontend       # Frontend development server
```

### Building & Distribution
```bash
npm run build-frontend       # Build React app for production
./build-desktop.sh          # Complete desktop app build script (.dmg installer)
npm run dist                # Build macOS desktop app with Electron Builder
npm run dist-all            # Build for macOS, Windows, and Linux
```

### Testing & Debugging
```bash
node test-transcription.js   # Test transcription file creation
./test-zoom-quick.sh        # Test Zoom audio device capture
cd frontend && npm test      # Run React component tests
```

## Environment Configuration

### Required: `backend/.env`
```
OPENAI_API_KEY=your_api_key_here  # Required for transcriptions
PORT=5001                          # Backend server port (optional, defaults to 5001)
```

## Key Directories & Files
- `recordings/` - Audio files (.wav, .mp3, .mp4, .m4a, .ogg, .webm, .flac)
- `recordings/temp/` - Temporary chunks for large file processing (auto-cleaned)
- `transcriptions/` - Text files (.txt) and revised versions (*_revised.txt)
- `metadata.json` - Persistent storage of recording metadata and transcription status
- `dist/` - Electron build output (installers and archives)

## Socket.IO Events

### Client → Server
- `start-recording` - Start recording with source: 'mic' | 'zoom' | 'teams' | 'system'
- `stop-recording` - Stop current recording
- `get-recordings` - Fetch all recordings with metadata
- `delete-recording` - Delete recording and associated transcription
- `transcribe-recording` - Start transcription process for a recording

### Server → Client
- `recording-started` - Confirms recording has begun
- `recording-stopped` - Returns recording metadata after stop
- `recordings-list` - Returns array of all recordings with metadata
- `transcription-started` - Notifies transcription process started
- `transcription-completed` - Returns transcription text and metadata
- `transcription-error` - Error details if transcription fails
- `progress-update` - Real-time progress for long operations

## Key Features & Implementation Details

### Audio Recording Pipeline
1. **Device Selection** (`audio-devices.js`):
   - Priority order: ZoomAudioDevice → Teams Audio → BlackHole+Mic → BlackHole → Built-in Mic
   - Multi-channel support (up to 65 channels for BlackHole)
   - Automatic channel remixing to stereo

2. **FFmpeg Configuration**:
   - Format: PCM 16-bit, 44.1kHz, stereo WAV
   - AVFoundation backend for macOS
   - Real-time audio level monitoring via stderr parsing

### Transcription Processing
1. **File Size Handling** (`audio-splitter.js`):
   - Automatic splitting of files >24MB into 3-minute chunks
   - MP3 encoding for temporary chunks (reduces size)
   - Context preservation across chunks

2. **AI Processing**:
   - Whisper API for speech-to-text (model: whisper-1)
   - GPT-4o-mini for text revision and grammatical improvement
   - Progress tracking with detailed status updates

### Real-time Features
- Audio level visualization during recording (60 FPS canvas animation)
- WebSocket-based progress updates for long operations
- Live recording status synchronization across UI components

### macOS Integration
- System tray icon with context menu
- Native menu bar with keyboard shortcuts
- Microphone permissions via entitlements.plist
- BlackHole virtual audio driver support

## Development Workflow

### Adding New Features
1. Backend changes trigger nodemon auto-restart
2. Frontend changes trigger React hot-reload
3. Electron requires manual restart for main process changes

### Common Tasks
```bash
# Check audio devices available
ffmpeg -f avfoundation -list_devices true -i ""

# Monitor backend logs
npm run dev-backend

# Test specific audio source
./test-zoom-quick.sh

# Build and test desktop app
./build-desktop.sh && open dist/Audio\ Recorder.app
```

### Error Handling Patterns
- Socket.IO reconnection with exponential backoff
- Graceful degradation for missing audio devices
- Automatic cleanup of temporary files
- User-friendly error messages with recovery suggestions

## Technical Decisions & Rationale

### Why Socket.IO over REST
- Real-time progress updates for long transcriptions
- Live audio visualization data streaming
- Immediate recording state synchronization
- Persistent connection for desktop app

### Why File-based Storage
- Privacy-first approach (no cloud storage)
- Immediate local access to recordings
- No size limitations or quotas
- Simple backup and migration

### Why Electron
- Native macOS audio permissions
- System tray integration
- Desktop notifications capability
- Consistent cross-platform experience

### Why Audio Splitting Strategy
- Whisper API 25MB file size limit
- Maintains context across chunks
- Parallel processing capability
- Reduced memory footprint