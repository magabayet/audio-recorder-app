#!/bin/bash

# Script de instalación manual de BlackHole
echo "========================================="
echo "🎙️ Instalación Manual de BlackHole"
echo "========================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${YELLOW}BlackHole ya está descargado por Homebrew.${NC}"
echo -e "${YELLOW}Ahora necesitamos instalarlo con permisos de administrador.${NC}"
echo ""
echo -e "${BLUE}Ejecuta este comando en una nueva ventana de Terminal:${NC}"
echo ""
echo -e "${BOLD}sudo installer -pkg /opt/homebrew/Caskroom/blackhole-2ch/0.6.1/BlackHole2ch-0.6.1.pkg -target /${NC}"
echo ""
echo "Te pedirá tu contraseña de administrador."
echo ""
echo -e "${YELLOW}Después de instalarlo:${NC}"
echo "1. Reinicia tu Mac (o cierra/abre sesión)"
echo "2. Ejecuta: ./AudioRecorder.command"
echo ""
echo -e "${GREEN}Alternativamente, descarga e instala manualmente:${NC}"
echo "1. Visita: https://existential.audio/blackhole/"
echo "2. Descarga 'BlackHole 2ch'"
echo "3. Abre el archivo .pkg descargado"
echo "4. Sigue el instalador (necesitarás tu contraseña)"
echo ""

# Abrir la página si el usuario quiere
read -p "¿Quieres abrir la página de descarga manual? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    open "https://existential.audio/blackhole/"
fi

echo ""
echo -e "${BLUE}Una vez instalado BlackHole, ejecuta:${NC}"
echo -e "${BOLD}./setup-audio-config.sh${NC}"
echo "para configurar los dispositivos de audio."