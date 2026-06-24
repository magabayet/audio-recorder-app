# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
Audio recording and transcription application for macOS that captures system audio and microphone input, with automatic transcription using OpenAI Whisper API. Supports multiple sources: microphone, Zoom meetings (via ZoomAudioDevice), Teams meetings, and system audio via BlackHole virtual driver. Codebase comments and documentation are primarily in Spanish.

## Architecture

### Three-tier Architecture
- **Backend (Node.js/Express - Port 5001)**: Express server with Socket.IO, FFmpeg audio capture, Whisper API integration
- **Frontend (React 19/TypeScript - Port 3000)**: SPA with real-time audio visualization and recording management
- **Desktop (Electron 27)**: Native macOS wrapper with system tray integration

### Key Components
- `backend/server.js` - Main server: Socket.IO WebSocket handling, FFmpeg audio capture via child_process spawn, Whisper API transcription, GPT-4o-mini text review
- `backend/audio-devices.js` - Audio device detection using FFmpeg AVFoundation device listing with priority selection
- `backend/audio-splitter.js` - Splits large files (>24MB) into 3-minute MP3 chunks for Whisper API limit
- `frontend/src/App.tsx` - Single component app: recording controls, file management, transcription display. All state in React hooks
- `frontend/src/components/AudioVisualizer.tsx` - Real-time waveform visualization using Web Audio API + Canvas
- `electron-main.js` - Electron main process with tray icon and native menu

### Data Flow
- Frontend connects to backend Socket.IO directly at `http://localhost:5001` (no proxy)
- Backend CORS allows all origins (permissive in dev, needed for Electron's `file://` protocol)
- Recording state tracked in-memory via `activeRecordings` Map (FFmpeg processes) and `recordingsMetadata` Map
- Persistent storage via `metadata.json` file (loaded at startup, saved after each change)

### Dev vs Packaged Mode
- Electron detects mode via `app.isPackaged`, `ELECTRON_IS_DEV`, or `NODE_ENV`
- **Dev**: Backend runs separately via `npm run dev-backend`; Electron loads `http://localhost:3000`
- **Packaged**: Electron spawns backend as child process, waits for `/health` endpoint (15s timeout), then loads `frontend/build/index.html` via `file://`
- **Data paths**: In dev, backend uses relative paths (`../recordings/`, `../transcriptions/`). In packaged mode, `DATA_DIR` env var points to `~/Library/Application Support/Audio Recorder/`
- **API key**: In dev, loaded from `backend/.env` via dotenv. In packaged mode, read from `extraResources/.env` by Electron and passed as env var

## Commands

### Installation
```bash
./setup.sh                   # Complete setup (FFmpeg check, all deps)
npm install                  # Root dependencies (Electron, concurrently)
cd backend && npm install    # Backend dependencies
cd frontend && npm install   # Frontend dependencies
```

### Development
```bash
npm run dev                  # All components (backend + frontend + electron via concurrently)
npm run dev-backend          # Backend only with nodemon (port 5001)
npm run dev-frontend         # Frontend only with hot-reload (port 3000)
```

### Testing
```bash
cd frontend && npm test                    # Run all React tests (Jest watch mode)
cd frontend && npm test -- --watchAll=false  # Run tests once (CI mode)
cd frontend && npm test -- App.test.tsx    # Run specific test file
node test-transcription.js                 # Test transcription file creation
./test-zoom-quick.sh                       # Test Zoom audio capture
./diagnose-audio.sh                        # Diagnose audio device issues
```

### Building
```bash
npm run build               # Frontend + Electron for macOS (.dmg, .zip)
npm run dist-all            # Build for macOS, Windows, Linux
./build-desktop.sh          # Complete desktop app build script
```

### Hot Reload
- Backend: nodemon auto-restart on changes
- Frontend: React hot-reload via react-scripts
- Electron: requires manual restart for `electron-main.js` changes

## Environment Configuration

### Required: `backend/.env`
```
OPENAI_API_KEY=your_api_key_here  # Required for transcriptions
PORT=5001                          # Optional, defaults to 5001
```

## Data Storage
- `recordings/` - Audio files (.wav, .mp3, .mp4, .m4a, .ogg, .webm, .flac)
- `recordings/temp/` - Temporary chunks during splitting (auto-cleaned per session via UUID subdirs)
- `transcriptions/` - Text files (.txt) and revised versions (*_revised.txt)
- `metadata.json` - Recording metadata and transcription status (loaded into memory at startup)

## API Reference

### REST Endpoints
- `POST /upload` - Upload audio (multipart/form-data, field: 'audio', max 500MB)
- `GET /health` - Health check with OpenAI config status
- `GET /api/transcription-exists/:fileName` - Check transcription exists
- `GET /download-transcription/:fileName?revised=true|false` - Download transcription
- `POST /api/review-text` - Review text with GPT-4o-mini (body: {text, fileName})

### Socket.IO Events
**Client → Server**: `start-recording` (source: 'mic'|'zoom'|'teams'|'system'), `stop-recording`, `get-recordings`, `delete-recording`, `transcribe-recording`

**Server → Client**: `recording-started`, `recording-stopped`, `recording-saved`, `recordings-list`, `transcription-started`, `transcription-completed`, `transcription-error`, `progress-update`, `file-uploaded`

## Audio Pipeline

### Device Selection Priority
ZoomAudioDevice → Teams Audio → BlackHole+Mic → BlackHole → Built-in Mic

### FFmpeg Configuration
- Format: PCM 16-bit, 44.1kHz, stereo WAV via AVFoundation backend
- Multi-channel devices (BlackHole 64ch, BlackHole+Mic with 65+ channels) get special `-ac 2` downmix or `pan=stereo` filter handling
- Device debugging: `ffmpeg -f avfoundation -list_devices true -i ""`

### Transcription Processing
- Files >24MB automatically split into 3-minute MP3 chunks (128kbps) using adaptive chunk duration based on actual bitrate
- Whisper API (whisper-1) for speech-to-text, **hardcoded to Spanish** (`language: 'es'`)
- Context maintained across chunks using previous chunk's last 500 chars as prompt
- GPT-4o-mini for optional text revision (grammar, clarity, punctuation)

## Technical Decisions
- **Socket.IO over REST**: Real-time progress updates for long transcriptions, live audio visualization
- **File-based storage**: Privacy-first, no cloud dependency, no size limits
- **Audio splitting**: Whisper API 25MB limit, context chaining across chunks
- **No frontend proxy**: Direct Socket.IO connection to backend port; CORS configured for dev ports
- **Backend port env var**: Frontend reads `REACT_APP_BACKEND_PORT` (default 5001) for all HTTP/Socket.IO connections
