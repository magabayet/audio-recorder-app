#!/bin/bash

# Script para reiniciar la aplicación
echo "========================================="
echo "🔄 Reiniciando Audio Recorder"
echo "========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detener procesos existentes
echo -e "${YELLOW}Deteniendo procesos existentes...${NC}"

# Matar procesos del backend
pkill -f "node.*server.js" 2>/dev/null && echo -e "${GREEN}✓${NC} Backend detenido" || echo -e "${YELLOW}⚠${NC}  Backend no estaba ejecutándose"

# Matar procesos del frontend
pkill -f "react-scripts start" 2>/dev/null && echo -e "${GREEN}✓${NC} Frontend detenido" || echo -e "${YELLOW}⚠${NC}  Frontend no estaba ejecutándose"

# Esperar un momento
sleep 2

echo ""
echo -e "${GREEN}Procesos detenidos. Ahora ejecuta:${NC}"
echo ""
echo "  ./AudioRecorder.command"
echo ""
echo "O si prefieres, haz doble clic en AudioRecorder.command"
echo ""
echo -e "${YELLOW}El servidor ahora aceptará conexiones desde cualquier puerto.${NC}"