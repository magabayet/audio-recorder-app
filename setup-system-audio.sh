#!/bin/bash

# Script para configurar grabación de audio del sistema
echo "========================================="
echo "🎙️ Configuración de Audio del Sistema"
echo "========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Verificar BlackHole
echo -e "${BLUE}1. Verificando BlackHole...${NC}"
if brew list blackhole-2ch &>/dev/null; then
    echo -e "${GREEN}✓${NC} BlackHole ya está instalado"
else
    echo -e "${YELLOW}⚠${NC}  BlackHole no está instalado"
    echo ""
    echo -e "${YELLOW}BlackHole es necesario para grabar el audio del sistema (Zoom, Teams, etc.)${NC}"
    read -p "¿Quieres instalar BlackHole ahora? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "Instalando BlackHole..."
        brew install blackhole-2ch
        echo -e "${GREEN}✓${NC} BlackHole instalado"
    else
        echo -e "${RED}Sin BlackHole solo podrás grabar el micrófono, no el audio del sistema${NC}"
    fi
fi

echo ""
echo -e "${BLUE}2. Dispositivos de audio disponibles:${NC}"
ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -E "\[AVFoundation.*audio" -A 20 | grep "\[" | grep -v "AVFoundation"

echo ""
echo -e "${MAGENTA}=========================================${NC}"
echo -e "${MAGENTA}📋 INSTRUCCIONES IMPORTANTES${NC}"
echo -e "${MAGENTA}=========================================${NC}"
echo ""

echo -e "${YELLOW}Para grabar SOLO el micrófono:${NC}"
echo "  No necesitas hacer nada especial, la app ya lo hace"
echo ""

echo -e "${YELLOW}Para grabar el AUDIO DEL SISTEMA (Zoom, Teams, música, etc.):${NC}"
echo ""
echo -e "${BLUE}Opción A: Solo audio del sistema (SIN tu voz)${NC}"
echo "  1. Ve a Preferencias del Sistema → Sonido → Salida"
echo "  2. Selecciona 'BlackHole 2ch' como dispositivo de salida"
echo "  3. NOTA: No escucharás el audio mientras grabas con esta opción"
echo ""

echo -e "${BLUE}Opción B: Audio del sistema + Tu voz + Escuchar (RECOMENDADO)${NC}"
echo "  1. Abre 'Configuración de Audio MIDI' (Audio MIDI Setup)"
echo "     Puedes buscarla en Spotlight (Cmd+Space)"
echo ""
echo "  2. Click en '+' (abajo izquierda) → 'Crear dispositivo de salida múltiple'"
echo ""
echo "  3. En el nuevo dispositivo, marca estas casillas:"
echo "     ☑ Built-in Output (para escuchar)"
echo "     ☑ BlackHole 2ch (para grabar)"
echo ""
echo "  4. En la columna 'Drift Correction', marca BlackHole 2ch"
echo ""
echo "  5. Ve a Preferencias del Sistema → Sonido → Salida"
echo "     Selecciona 'Dispositivo de salida múltiple'"
echo ""
echo "  6. Para grabar tu voz también:"
echo "     - Abre 'Configuración de Audio MIDI' nuevamente"
echo "     - Click en '+' → 'Crear dispositivo agregado'"
echo "     - Marca: ☑ BlackHole 2ch  ☑ Micrófono de MacBook Pro"
echo "     - Usa este dispositivo agregado en la app"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Configuración explicada${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Abrir Audio MIDI Setup si el usuario quiere
read -p "¿Quieres abrir 'Configuración de Audio MIDI' ahora? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    open -a "Audio MIDI Setup"
    echo "Audio MIDI Setup abierto. Sigue las instrucciones anteriores."
fi

echo ""
echo -e "${YELLOW}Una vez configurado, reinicia la aplicación con:${NC}"
echo "  ./AudioRecorder.command"
echo ""