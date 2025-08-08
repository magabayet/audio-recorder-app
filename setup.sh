#!/bin/bash

echo "========================================="
echo "Audio Recorder - Setup Script"
echo "========================================="

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg is not installed. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "Homebrew is not installed. Please install Homebrew first:"
        echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    brew install ffmpeg
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "Installing dependencies..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

cd ..

echo "========================================="
echo "Setup complete!"
echo "========================================="
echo ""
echo "To start the application, run:"
echo "  npm run start"
echo ""
echo "Or for development mode:"
echo "  npm run dev"
echo ""
echo "The backend will run on http://localhost:5000"
echo "The frontend will run on http://localhost:3000"
echo ""
echo "IMPORTANT: To record system audio on macOS:"
echo "1. Install BlackHole (virtual audio driver):"
echo "   brew install blackhole-2ch"
echo ""
echo "2. Configure Audio MIDI Setup:"
echo "   - Open 'Audio MIDI Setup' application"
echo "   - Click '+' button and create 'Multi-Output Device'"
echo "   - Check both 'Built-in Output' and 'BlackHole 2ch'"
echo "   - Set this as your system output device"
echo ""
echo "3. Grant microphone permissions when prompted"