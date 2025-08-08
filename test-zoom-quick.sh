#!/bin/bash

echo "======================================"
echo "🎥 PRUEBA RÁPIDA DE AUDIO DE ZOOM"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Este script probará la grabación desde ZoomAudioDevice"
echo ""
echo -e "${YELLOW}ANTES DE CONTINUAR:${NC}"
echo "1. Abre Zoom"
echo "2. Únete a una reunión o inicia una prueba"
echo "3. Asegúrate de que hay audio (música, voz, etc.)"
echo ""
read -p "Presiona ENTER cuando Zoom esté listo..."

echo ""
echo "🎙️ Iniciando grabación de prueba (10 segundos)..."
echo ""

# Grabar desde ZoomAudioDevice (índice 2)
ffmpeg -f avfoundation -ac 2 -i ":2" -t 10 -ar 44100 -y zoom_test.wav 2>/dev/null &
PID=$!

# Mostrar progreso
for i in {1..10}; do
    echo -ne "\rGrabando: $i/10 segundos"
    sleep 1
done
echo ""

wait $PID

echo ""
echo -e "${GREEN}✅ Grabación completada${NC}"
echo ""

# Verificar el archivo
SIZE=$(du -h zoom_test.wav | cut -f1)
echo "📁 Archivo creado: zoom_test.wav ($SIZE)"
echo ""

# Analizar el audio
echo "📊 Analizando el audio..."
ANALYSIS=$(ffmpeg -i zoom_test.wav -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume")

if echo "$ANALYSIS" | grep -q "mean_volume: -91.0 dB"; then
    echo -e "${RED}❌ El audio está MUDO (silencio total)${NC}"
    echo ""
    echo "POSIBLES SOLUCIONES:"
    echo "-------------------"
    echo "1. En Zoom > Configuración > Audio:"
    echo "   - Altavoz: Cambia a 'ZoomAudioDevice'"
    echo "   - Prueba el altavoz para verificar que funciona"
    echo ""
    echo "2. Verifica que Zoom está reproduciendo audio:"
    echo "   - Pide a alguien que hable"
    echo "   - Reproduce un video compartido"
    echo "   - Usa la prueba de audio de Zoom"
    echo ""
    echo "3. Intenta grabar desde BlackHole:"
    echo "   ./test-blackhole.sh"
else
    echo -e "${GREEN}✅ Se detectó audio en la grabación${NC}"
    echo "$ANALYSIS"
    echo ""
    echo "🔊 Reproduciendo el audio grabado..."
    afplay zoom_test.wav
fi

echo ""
echo "======================================"
echo "📝 RESUMEN"
echo "======================================"
echo ""
echo "Si el audio está mudo, necesitas configurar Zoom:"
echo ""
echo "OPCIÓN A - Usar ZoomAudioDevice:"
echo "  1. En Zoom > Configuración > Audio"
echo "  2. Altavoz: Selecciona 'ZoomAudioDevice'"
echo "  3. Reinicia la grabación"
echo ""
echo "OPCIÓN B - Usar BlackHole (recomendado):"
echo "  1. En macOS > Preferencias del Sistema > Sonido"
echo "  2. Salida: Selecciona 'BlackHole 64ch'"
echo "  3. En la app, usa 'Micrófono' y se grabará el sistema"
echo ""
echo "Para más ayuda, ejecuta: ./setup-zoom-audio.sh"