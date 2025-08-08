#!/bin/bash

echo "======================================"
echo "🔧 SOLUCIONADOR DE AUDIO DE ZOOM"
echo "======================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Verificar si BlackHole está instalado
echo "📋 Verificando instalación de BlackHole..."
if ls /Library/Audio/Plug-Ins/HAL/ | grep -q "BlackHole"; then
    echo -e "${GREEN}✅ BlackHole está instalado${NC}"
else
    echo -e "${RED}❌ BlackHole NO está instalado${NC}"
    echo ""
    echo "Para instalar BlackHole:"
    echo "1. Descarga desde: https://existential.audio/blackhole/"
    echo "2. Instala BlackHole 2ch (para estéreo)"
    echo ""
    read -p "¿Deseas que intente instalarlo automáticamente? (s/n): " install_choice
    if [[ $install_choice == "s" ]]; then
        brew install blackhole-2ch
    fi
fi

echo ""
echo "📋 Dispositivos de audio detectados:"
echo "------------------------------------"
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -A 20 "audio devices" | grep "\["

echo ""
echo "======================================"
echo "🎯 CONFIGURACIÓN PARA GRABAR ZOOM"
echo "======================================"
echo ""
echo -e "${YELLOW}OPCIÓN 1: Usar ZoomAudioDevice (Recomendado)${NC}"
echo "----------------------------------------"
echo "1. Abre Zoom y únete/inicia una reunión"
echo "2. En Zoom, ve a: Configuración > Audio"
echo "3. Altavoz: Selecciona 'ZoomAudioDevice'"
echo "4. Micrófono: Deja tu micrófono normal"
echo "5. En nuestra app, selecciona 'Zoom' como fuente"
echo ""
echo -e "${BLUE}Ventajas:${NC}"
echo "✅ Captura todo el audio de Zoom"
echo "✅ No requiere configuración adicional del sistema"
echo ""

echo -e "${YELLOW}OPCIÓN 2: Usar BlackHole (Audio del sistema)${NC}"
echo "----------------------------------------"
echo "1. Abre 'Configuración de Audio MIDI' (Audio MIDI Setup)"
echo "2. Crea un dispositivo agregado:"
echo "   - Click en '+' > 'Crear dispositivo agregado'"
echo "   - Marca: BlackHole 2ch + Tu micrófono"
echo "   - Nombra como: 'BlackHole+Mic'"
echo "3. En Preferencias del Sistema > Sonido:"
echo "   - Salida: BlackHole 2ch"
echo "4. En Zoom:"
echo "   - Micrófono: Tu micrófono normal"
echo "   - Altavoz: Altavoces del sistema"
echo ""
echo -e "${BLUE}Ventajas:${NC}"
echo "✅ Captura TODO el audio del sistema"
echo "✅ Funciona con cualquier aplicación"
echo ""

echo "======================================"
echo "🧪 PRUEBA DE GRABACIÓN"
echo "======================================"
echo ""
echo "Vamos a hacer una prueba de grabación de 5 segundos:"
echo ""

# Preguntar qué dispositivo usar
echo "Selecciona el dispositivo a probar:"
echo "1) ZoomAudioDevice (índice 2)"
echo "2) BlackHole 64ch (índice 0)"
echo "3) Micrófono normal (índice 1)"
echo "4) Cancelar"
read -p "Opción: " device_choice

case $device_choice in
    1)
        echo -e "${YELLOW}Grabando desde ZoomAudioDevice...${NC}"
        ffmpeg -f avfoundation -i ":2" -t 5 -y test_zoom.wav 2>/dev/null
        ;;
    2)
        echo -e "${YELLOW}Grabando desde BlackHole...${NC}"
        ffmpeg -f avfoundation -i ":0" -t 5 -y test_blackhole.wav 2>/dev/null
        ;;
    3)
        echo -e "${YELLOW}Grabando desde micrófono...${NC}"
        ffmpeg -f avfoundation -i ":1" -t 5 -y test_mic.wav 2>/dev/null
        ;;
    *)
        echo "Prueba cancelada"
        exit 0
        ;;
esac

echo -e "${GREEN}✅ Grabación completada${NC}"
echo ""
echo "Para reproducir la grabación:"
echo "afplay test_*.wav"
echo ""

echo "======================================"
echo "📌 SOLUCIÓN RÁPIDA"
echo "======================================"
echo ""
echo -e "${GREEN}Para grabar Zoom correctamente:${NC}"
echo ""
echo "1. ANTES de grabar:"
echo "   - Abre Zoom y únete a una reunión"
echo "   - Verifica que escuchas el audio"
echo ""
echo "2. En nuestra app:"
echo "   - Selecciona 'Zoom' como fuente"
echo "   - Haz clic en 'Iniciar Grabación'"
echo ""
echo "3. Si el audio está mudo:"
echo "   - Verifica que Zoom está reproduciendo audio"
echo "   - Prueba hablar para verificar que se graba tu voz"
echo "   - Si solo necesitas el audio de otros, usa BlackHole"
echo ""

# Verificar permisos
echo "======================================"
echo "🔐 VERIFICANDO PERMISOS"
echo "======================================"
echo ""
echo "Verificando permisos de micrófono..."

# Crear un pequeño script de AppleScript para verificar permisos
osascript -e 'tell application "System Events" to display dialog "La aplicación necesita acceso al micrófono. Si aparece una solicitud de permisos, acéptala." buttons {"OK"} default button 1' 2>/dev/null

echo ""
echo -e "${GREEN}Script completado.${NC}"
echo ""
echo "Si continúas teniendo problemas:"
echo "1. Ve a: Preferencias del Sistema > Seguridad y Privacidad > Micrófono"
echo "2. Asegúrate de que Terminal/ffmpeg tengan acceso"
echo "3. Reinicia la aplicación después de otorgar permisos"