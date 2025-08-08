#!/bin/bash

# Script de configuración de audio para BlackHole
echo "========================================="
echo "📋 Configuración de Audio con BlackHole"
echo "========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Verificar si BlackHole está instalado
echo -e "${BLUE}Verificando instalación de BlackHole...${NC}"
if system_profiler SPAudioDataType | grep -q "BlackHole"; then
    echo -e "${GREEN}✅ BlackHole está instalado correctamente!${NC}"
    echo ""
    echo -e "${CYAN}Dispositivos de audio detectados:${NC}"
    system_profiler SPAudioDataType | grep -E "BlackHole|Built-in|Microphone" | grep -v "Manufacturer" | head -20
else
    echo -e "${RED}❌ BlackHole no está instalado${NC}"
    echo ""
    echo "Por favor, primero instala BlackHole:"
    echo "1. Ejecuta: ./install-blackhole-manual.sh"
    echo "2. O descarga desde: https://existential.audio/blackhole/"
    exit 1
fi

echo ""
echo -e "${MAGENTA}=========================================${NC}"
echo -e "${MAGENTA}Configuración de Audio MIDI${NC}"
echo -e "${MAGENTA}=========================================${NC}"
echo ""

echo -e "${CYAN}Ahora configuraremos los dispositivos de audio.${NC}"
echo ""

echo -e "${YELLOW}PASO 1: Crear Dispositivo de Salida Múltiple${NC}"
echo -e "${YELLOW}(Para escuchar el audio mientras grabas)${NC}"
echo ""
echo "1. Abre 'Configuración de Audio MIDI'"
echo "2. Click en '+' (esquina inferior izquierda)"
echo "3. Selecciona 'Crear dispositivo de salida múltiple'"
echo "4. Marca estas casillas:"
echo "   ☑️ Built-in Output (para escuchar)"
echo "   ☑️ BlackHole 2ch (para grabar)"
echo "5. En 'Drift Correction', marca BlackHole 2ch"
echo ""

echo -e "${YELLOW}PASO 2: Crear Dispositivo Agregado${NC}"
echo -e "${YELLOW}(Para grabar tu voz + audio del sistema)${NC}"
echo ""
echo "1. Click en '+' nuevamente"
echo "2. Selecciona 'Crear dispositivo agregado'"
echo "3. Marca:"
echo "   ☑️ BlackHole 2ch"
echo "   ☑️ Micrófono de MacBook Pro"
echo "4. Cierra Audio MIDI Setup"
echo ""

read -p "Presiona Enter para abrir 'Configuración de Audio MIDI'..."
open -a "Audio MIDI Setup"

echo ""
echo -e "${YELLOW}PASO 3: Configurar Preferencias del Sistema${NC}"
echo ""
echo "1. Ve a: Preferencias del Sistema → Sonido → Salida"
echo "2. Selecciona: 'Dispositivo de salida múltiple'"
echo ""

read -p "Presiona Enter cuando hayas completado la configuración..."

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Verificando configuración${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Mostrar dispositivos disponibles para FFmpeg
echo -e "${CYAN}Dispositivos de audio disponibles para grabación:${NC}"
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -E "\[AVFoundation.*audio" -A 20 | grep "\[" | grep -v "AVFoundation" | head -10

echo ""
echo -e "${GREEN}✅ ¡Configuración completada!${NC}"
echo ""
echo -e "${CYAN}Para usar la aplicación:${NC}"
echo ""
echo "1. Ejecuta: ${BOLD}./AudioRecorder.command${NC}"
echo "2. La app detectará automáticamente los dispositivos"
echo "3. Verás en los logs qué dispositivo está usando:"
echo "   • 'Usando dispositivo agregado' = Sistema + Micrófono"
echo "   • 'Usando BlackHole' = Solo audio del sistema"
echo "   • 'Usando micrófono' = Solo tu voz"
echo ""
echo -e "${YELLOW}Para Zoom/Teams:${NC}"
echo "• Micrófono: Micrófono de MacBook Pro"
echo "• Altavoz: Dispositivo de salida múltiple"
echo ""