#!/bin/bash

# Script para crear un launcher tipo aplicación
echo "========================================="
echo "Creando Audio Recorder App Launcher"
echo "========================================="

APP_NAME="Audio Recorder"
APP_DIR="/Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER"
LAUNCHER_DIR="$APP_DIR/AudioRecorder.app"

# Crear estructura de aplicación macOS
echo "Creando estructura de aplicación..."
mkdir -p "$LAUNCHER_DIR/Contents/MacOS"
mkdir -p "$LAUNCHER_DIR/Contents/Resources"

# Crear el script ejecutable
cat > "$LAUNCHER_DIR/Contents/MacOS/AudioRecorder" << 'EOF'
#!/bin/bash

# Launcher para Audio Recorder
APP_DIR="/Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER"

# Abrir Terminal y ejecutar el comando
osascript -e "
tell application \"Terminal\"
    activate
    do script \"cd '$APP_DIR' && ./AudioRecorder.command\"
end tell
"
EOF

# Hacer ejecutable
chmod +x "$LAUNCHER_DIR/Contents/MacOS/AudioRecorder"

# Crear Info.plist
cat > "$LAUNCHER_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Audio Recorder</string>
    <key>CFBundleDisplayName</key>
    <string>Audio Recorder</string>
    <key>CFBundleIdentifier</key>
    <string>com.audiorecorder.launcher</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>AudioRecorder</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.12</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

# Crear ícono (usando emoji como fallback)
echo "🎙️" > "$LAUNCHER_DIR/Contents/Resources/AppIcon.txt"

echo ""
echo "✅ Launcher de aplicación creado exitosamente!"
echo ""
echo "========================================="
echo "📍 Ubicación: $LAUNCHER_DIR"
echo "========================================="
echo ""
echo "Para agregar al Dock:"
echo "1. Abre Finder"
echo "2. Ve a: $APP_DIR"
echo "3. Arrastra 'AudioRecorder.app' al Dock"
echo ""
echo "O ejecuta este comando:"
echo "open -a \"$LAUNCHER_DIR\""
echo ""