#!/bin/bash

# Audio Recorder - Script de Inicio Rápido
# Doble clic para abrir la aplicación

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Obtener el directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

clear

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ${BOLD}🎙️  Audio Recorder Application${CYAN}        ║${NC}"
echo -e "${CYAN}║      ${YELLOW}Sistema de Grabación y${CYAN}            ║${NC}"
echo -e "${CYAN}║      ${YELLOW}Transcripción Automática${CYAN}           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Función de limpieza al salir
cleanup() {
    echo -e "\n${YELLOW}Cerrando Audio Recorder...${NC}"
    # Matar procesos en los puertos
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Aplicación cerrada${NC}"
    exit 0
}

# Capturar señales de salida
trap cleanup EXIT INT TERM

# Verificar dependencias básicas
echo -e "${BLUE}▶ Verificando sistema...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js desde https://nodejs.org"
    read -p "Presiona Enter para salir..."
    exit 1
fi

# Verificar FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  FFmpeg no está instalado${NC}"
    echo "Instalando FFmpeg..."
    if command -v brew &> /dev/null; then
        brew install ffmpeg
    else
        echo -e "${RED}❌ Homebrew no está instalado${NC}"
        echo "Instala Homebrew desde https://brew.sh"
        read -p "Presiona Enter para salir..."
        exit 1
    fi
fi

# Verificar API Key
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Configuración no encontrada${NC}"
    echo ""
    echo "Por favor ingresa tu API Key de OpenAI"
    echo "(Presiona Enter para omitir - las transcripciones no funcionarán):"
    read -s OPENAI_KEY
    mkdir -p backend
    if [ -z "$OPENAI_KEY" ]; then
        echo "OPENAI_API_KEY=your_key_here" > backend/.env
    else
        echo "OPENAI_API_KEY=$OPENAI_KEY" > backend/.env
    fi
    echo "PORT=5001" >> backend/.env
    echo -e "${GREEN}✅ Configuración creada${NC}"
fi

# Verificar dependencias de Node
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando componentes (primera vez)...${NC}"
    echo "Esto puede tomar unos minutos..."
    npm run install-all
    echo -e "${GREEN}✅ Componentes instalados${NC}"
fi

# Limpiar puertos
echo -e "${BLUE}▶ Preparando aplicación...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null

# Iniciar la aplicación
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ${BOLD}🚀 Iniciando Audio Recorder...${GREEN}        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "La aplicación se abrirá automáticamente en:"
echo -e "  ${CYAN}►${NC} Aplicación Electron (escritorio)"
echo -e "  ${CYAN}►${NC} Navegador web: ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Para detener: Presiona ${BOLD}Ctrl+C${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ejecutar la aplicación
npm run dev