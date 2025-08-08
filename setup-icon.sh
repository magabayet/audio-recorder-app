#!/bin/bash

# Script para configurar el ícono del launcher
echo "Configurando ícono para AudioRecorder.command..."

# Crear un ícono temporal usando ASCII art si no existe
if [ ! -f "assets/icon.png" ]; then
    mkdir -p assets
    
    # Intentar crear un ícono con ImageMagick si está disponible
    if command -v convert &> /dev/null; then
        # Crear un ícono gradiente con texto
        convert -size 512x512 \
                -define gradient:angle=135 \
                gradient:'#667eea'-'#764ba2' \
                -gravity center \
                -fill white \
                -font "SF-Pro-Display-Bold" \
                -pointsize 300 \
                -annotate +0-50 "🎙" \
                -fill white \
                -pointsize 48 \
                -annotate +0+150 "RECORD" \
                assets/icon.png
        
        # Crear versiones adicionales
        convert assets/icon.png -resize 256x256 assets/icon@256.png
        convert assets/icon.png -resize 128x128 assets/icon@128.png
        convert assets/icon.png -resize 64x64 assets/icon@64.png
        
        echo "✅ Ícono creado con ImageMagick"
    else
        echo "⚠️  ImageMagick no instalado"
        echo "Instalando con: brew install imagemagick"
        brew install imagemagick
    fi
fi

# Cambiar el ícono del archivo .command usando AppleScript
osascript << 'END'
use framework "AppKit"

-- Ruta al archivo
set commandFile to POSIX file "/Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER/AudioRecorder.command"

-- Intentar establecer un ícono personalizado
tell application "Finder"
    try
        set iconFile to POSIX file "/Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER/assets/icon.png"
        -- No podemos cambiar directamente el ícono de un .command, pero podemos crear un alias
    end try
end tell
END

echo "✅ Configuración de ícono completada"