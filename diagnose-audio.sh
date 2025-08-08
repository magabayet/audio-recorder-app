#!/bin/bash

# Script de diagnóstico de audio
echo "========================================="
echo "🔍 Diagnóstico de Audio - Audio Recorder"
echo "========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar FFmpeg
echo -e "${BLUE}1. Verificando FFmpeg...${NC}"
if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}✓${NC} FFmpeg instalado"
    ffmpeg -version | head -n1
else
    echo -e "${RED}✗${NC} FFmpeg no encontrado"
    echo "Instalar con: brew install ffmpeg"
fi
echo ""

# 2. Listar dispositivos de audio disponibles
echo -e "${BLUE}2. Dispositivos de audio disponibles:${NC}"
echo -e "${YELLOW}Ejecutando: ffmpeg -f avfoundation -list_devices true -i \"\"${NC}"
echo ""
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -E "\[AVFoundation|device" | grep -v "dummy"
echo ""

# 3. Verificar BlackHole
echo -e "${BLUE}3. Verificando BlackHole (audio virtual):${NC}"
if brew list blackhole-2ch &>/dev/null; then
    echo -e "${GREEN}✓${NC} BlackHole instalado"
else
    echo -e "${YELLOW}⚠${NC}  BlackHole no instalado"
    echo "Para grabar audio del sistema, instala con:"
    echo "brew install blackhole-2ch"
fi
echo ""

# 4. Verificar permisos
echo -e "${BLUE}4. Verificando permisos de micrófono:${NC}"
echo "macOS requiere permisos explícitos para grabar audio."
echo ""
echo -e "${YELLOW}Para verificar/otorgar permisos:${NC}"
echo "1. Ve a: Preferencias del Sistema → Seguridad y Privacidad → Privacidad"
echo "2. Selecciona 'Micrófono' en la lista izquierda"
echo "3. Asegúrate de que 'Terminal' esté marcado"
echo ""

# 5. Probar grabación simple
echo -e "${BLUE}5. Prueba de grabación (5 segundos):${NC}"
echo "Intentando grabar desde el micrófono predeterminado..."
echo ""

TEST_FILE="/tmp/test_recording.wav"

# Intentar grabar con el dispositivo 0 (micrófono)
echo -e "${YELLOW}Comando: ffmpeg -f avfoundation -i \":0\" -t 5 -y $TEST_FILE${NC}"
echo "Grabando por 5 segundos... (habla para probar el micrófono)"

ffmpeg -f avfoundation -i ":0" -t 5 -y "$TEST_FILE" 2>/tmp/ffmpeg_test.log

if [ -f "$TEST_FILE" ]; then
    FILE_SIZE=$(du -h "$TEST_FILE" | cut -f1)
    echo -e "${GREEN}✓${NC} Grabación exitosa! Tamaño: $FILE_SIZE"
    echo "Archivo de prueba: $TEST_FILE"
    
    # Reproducir el audio grabado (opcional)
    read -p "¿Quieres reproducir el audio grabado? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        afplay "$TEST_FILE"
    fi
else
    echo -e "${RED}✗${NC} Error en la grabación"
    echo "Ver log de errores:"
    cat /tmp/ffmpeg_test.log | tail -20
fi
echo ""

# 6. Configuración recomendada para grabar sistema + micrófono
echo -e "${BLUE}6. Configuración recomendada:${NC}"
echo ""
echo -e "${YELLOW}Para grabar SOLO el micrófono:${NC}"
echo "  ffmpeg -f avfoundation -i \":0\" output.wav"
echo ""
echo -e "${YELLOW}Para grabar SOLO el audio del sistema (requiere BlackHole):${NC}"
echo "  1. Configura BlackHole como salida de audio"
echo "  2. ffmpeg -f avfoundation -i \":BlackHole 2ch\" output.wav"
echo ""
echo -e "${YELLOW}Para grabar AMBOS (sistema + micrófono):${NC}"
echo "  1. Crea un dispositivo agregado en Audio MIDI Setup"
echo "  2. ffmpeg -f avfoundation -i \"Aggregate Device:0\" output.wav"
echo ""

# 7. Verificar el servidor
echo -e "${BLUE}7. Verificando servidor backend:${NC}"
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Servidor backend respondiendo en puerto 5001"
else
    echo -e "${RED}✗${NC} Servidor backend no responde"
    echo "Ejecuta: ./AudioRecorder.command"
fi
echo ""

echo "========================================="
echo -e "${GREEN}Diagnóstico completado${NC}"
echo "========================================="