#!/bin/bash

# Script de instalación de BlackHole
echo "========================================="
echo "🎙️ Instalación de BlackHole Audio Driver"
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

# Verificar si ya está instalado
echo -e "${BLUE}Verificando si BlackHole ya está instalado...${NC}"
if system_profiler SPAudioDataType | grep -q "BlackHole"; then
    echo -e "${GREEN}✅ BlackHole ya está instalado!${NC}"
    echo ""
    echo "Dispositivos de audio detectados:"
    system_profiler SPAudioDataType | grep -E "BlackHole|Built-in|Microphone" | grep -v "Manufacturer"
    echo ""
    read -p "BlackHole ya está instalado. ¿Quieres continuar con la configuración? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 0
    fi
else
    echo -e "${YELLOW}BlackHole no está instalado${NC}"
    echo ""
    echo -e "${CYAN}BlackHole es un driver de audio virtual gratuito que permite${NC}"
    echo -e "${CYAN}capturar el audio del sistema (Zoom, Teams, música, etc.)${NC}"
    echo ""
    
    echo -e "${YELLOW}Opciones de instalación:${NC}"
    echo ""
    echo -e "${BLUE}Opción 1: Instalación automática con Homebrew${NC}"
    echo "  Ejecuta este comando en Terminal:"
    echo -e "${BOLD}  brew install --cask blackhole-2ch${NC}"
    echo ""
    echo -e "${BLUE}Opción 2: Descarga manual${NC}"
    echo "  1. Visita: https://existential.audio/blackhole/"
    echo "  2. Descarga 'BlackHole 2ch'"
    echo "  3. Abre el instalador .pkg"
    echo "  4. Sigue las instrucciones"
    echo ""
    
    read -p "¿Quieres intentar la instalación automática? (s/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo ""
        echo -e "${YELLOW}Instalando BlackHole...${NC}"
        echo -e "${YELLOW}Se te pedirá tu contraseña de administrador${NC}"
        echo ""
        
        # Intentar instalación con brew
        brew install --cask blackhole-2ch
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ BlackHole instalado correctamente${NC}"
            echo -e "${YELLOW}Nota: Es posible que necesites reiniciar para que tome efecto${NC}"
        else
            echo ""
            echo -e "${RED}Error en la instalación automática${NC}"
            echo -e "${YELLOW}Por favor, instala manualmente desde:${NC}"
            echo "https://existential.audio/blackhole/"
            open "https://existential.audio/blackhole/"
            exit 1
        fi
    else
        echo ""
        echo -e "${YELLOW}Abriendo página de descarga...${NC}"
        open "https://existential.audio/blackhole/"
        echo ""
        echo "Después de instalar BlackHole, ejecuta este script nuevamente"
        exit 0
    fi
fi

echo ""
echo -e "${MAGENTA}=========================================${NC}"
echo -e "${MAGENTA}📋 Configuración de Audio${NC}"
echo -e "${MAGENTA}=========================================${NC}"
echo ""

echo -e "${CYAN}Ahora necesitamos configurar los dispositivos de audio.${NC}"
echo ""
echo -e "${YELLOW}Voy a abrir 'Configuración de Audio MIDI'${NC}"
echo -e "${YELLOW}Sigue estos pasos:${NC}"
echo ""
echo -e "${BOLD}1. Crear Dispositivo de Salida Múltiple:${NC}"
echo "   • Click en '+' (esquina inferior izquierda)"
echo "   • Selecciona 'Crear dispositivo de salida múltiple'"
echo "   • Marca estas casillas:"
echo "     ☑️ Built-in Output"
echo "     ☑️ BlackHole 2ch"
echo "   • En 'Drift Correction', marca BlackHole 2ch"
echo ""
echo -e "${BOLD}2. Crear Dispositivo Agregado (opcional, para grabar tu voz):${NC}"
echo "   • Click en '+' nuevamente"
echo "   • Selecciona 'Crear dispositivo agregado'"
echo "   • Marca:"
echo "     ☑️ BlackHole 2ch"
echo "     ☑️ Micrófono de MacBook Pro"
echo ""

read -p "Presiona Enter para abrir 'Configuración de Audio MIDI'..."
open -a "Audio MIDI Setup"

echo ""
echo -e "${YELLOW}Después de configurar, ve a:${NC}"
echo "Preferencias del Sistema → Sonido → Salida"
echo "Selecciona: 'Dispositivo de salida múltiple'"
echo ""

read -p "Presiona Enter cuando hayas terminado la configuración..."

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Configuración completada${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Verificar dispositivos actuales
echo -e "${BLUE}Dispositivos de audio disponibles ahora:${NC}"
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -E "\[AVFoundation.*audio" -A 20 | grep "\[" | grep -v "AVFoundation"

echo ""
echo -e "${CYAN}¡Listo! Ahora puedes:${NC}"
echo ""
echo "1. Reiniciar la aplicación:"
echo -e "${BOLD}   ./AudioRecorder.command${NC}"
echo ""
echo "2. La app detectará automáticamente BlackHole"
echo "3. Podrás grabar audio del sistema + tu voz"
echo ""
echo -e "${YELLOW}Configuración para Zoom/Teams:${NC}"
echo "• Micrófono: Micrófono de MacBook Pro"
echo "• Altavoz: Dispositivo de salida múltiple"
echo ""