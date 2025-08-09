# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
This is an audio recording and transcription application for macOS that captures system audio and microphone input, with automatic transcription using OpenAI Whisper API. The app supports recording from multiple sources including microphone, Zoom, and Teams meetings.

## Architecture

### Backend (Node.js/Express)
- **Main Server**: `backend/server.js` - Express server with Socket.IO for real-time communication
- **Audio Processing**: Uses FFmpeg for audio capture and format conversion
- **Transcription**: OpenAI Whisper API integration with automatic file splitting for large audio files (>24MB)
- **Audio Devices**: `backend/audio-devices.js` - Detects and selects appropriate audio input devices
- **Audio Splitter**: `backend/audio-splitter.js` - Handles splitting large audio files for transcription

### Frontend (React/TypeScript)
- **Main Component**: `frontend/src/App.tsx` - Single-page application with recording controls and file management
- **Audio Visualizer**: `frontend/src/components/AudioVisualizer.tsx` - Real-time audio visualization during recording
- **Socket.IO Client**: Real-time communication with backend for recording status and progress updates

### Audio Configuration
- Uses BlackHole virtual audio driver for system audio capture
- Supports multiple audio sources: microphone, Zoom (ZoomAudioDevice), Teams
- Automatic device detection and configuration based on selected source

## Development Commands

### Installation
```bash
# Install all dependencies (backend and frontend)
npm run install-all

# Or install separately
cd backend && npm install
cd frontend && npm install
```

### Running the Application
```bash
# Start both backend and frontend (production mode)
npm run start

# Development mode (with auto-reload)
npm run dev

# Start components separately
npm run start-backend  # Backend on port 5001
npm run start-frontend # Frontend on port 3000
```

### Building Desktop App
```bash
# Build Electron desktop app (creates .dmg installer)
./build-desktop.sh

# Simple launcher (no build required)
./start-app.sh
# Or double-click AudioRecorder.command
```

### Testing
```bash
# Test transcription functionality
node test-transcription.js

# Test Zoom recording
./test-zoom-quick.sh
```

## Environment Configuration

### API Keys (backend/.env)
```
OPENAI_API_KEY=your_api_key_here
PORT=5001
```

## Key File Locations
- **Recordings**: `/recordings/` - Audio files (.wav, .mp3, .mp4, .m4a, .ogg, .webm, .flac)
- **Transcriptions**: `/transcriptions/` - Text files (.txt) and revised versions (*_revised.txt)
- **Metadata**: `/metadata.json` - Persistent storage of recording metadata and transcriptions
- **Temp Files**: `/recordings/temp/` - Temporary chunks for large file processing

## Audio Recording Details
- **FFmpeg Configuration**: Automatic detection of multi-channel devices (BlackHole + Mic with 65 channels)
- **Channel Remixing**: Handles complex audio setups with pan filters for stereo output
- **Format**: PCM 16-bit, 44.1kHz sample rate, stereo output

## Socket.IO Events

### Client to Server
- `start-recording`: Begin audio capture with source type (mic/zoom/teams)
- `stop-recording`: End current recording session
- `get-recordings`: Fetch list of all recordings
- `delete-recording`: Remove recording and its transcription
- `transcribe-recording`: Initiate transcription for existing audio file

### Server to Client
- `recording-started`: Confirmation with recording ID
- `recording-stopped`: Recording completed with duration
- `recordings-list`: Array of recording objects with metadata
- `transcription-started`: Transcription process initiated
- `transcription-completed`: Transcription text and file path
- `progress-update`: Real-time updates during transcription (file analysis, splitting, processing)

## Transcription Features
- **Automatic Splitting**: Files >24MB are split into chunks for processing
- **Progress Tracking**: Real-time updates with emoji indicators and progress percentage
- **Text Revision**: AI-powered text editing and correction using GPT-4
- **Persistent Storage**: All transcriptions saved to disk with metadata

## Port Management
The application automatically handles port conflicts:
- Checks if ports 5001 (backend) and 4444 (alternative frontend) are in use
- Kills existing processes on these ports before starting
- Falls back to alternative ports if needed

## Audio Device Priority
When selecting audio devices, the system follows this priority:
1. **Zoom Recording**: ZoomAudioDevice (if available and Zoom source selected)
2. **Teams Recording**: Specific Teams audio device
3. **System Audio**: BlackHole virtual device for system capture
4. **Microphone**: Default microphone or explicitly selected device

## Error Handling
- Automatic retry for failed transcriptions
- Graceful degradation if OpenAI API is unavailable
- Detailed error messages in both console and UI
- FFmpeg process monitoring with stderr output logging