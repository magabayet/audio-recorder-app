#!/bin/bash

# =============================================================================
# Audio Recorder - Launcher Script v2.0
# Aplicación de grabación de audio del sistema con transcripción
# =============================================================================

# Configuración
APP_NAME="Audio Recorder"
BACKEND_PORT=5001
FRONTEND_PORT=4444
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Cambiar al directorio de la aplicación
cd "$APP_DIR"

# Limpiar pantalla y mostrar banner
clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}🎙️  Audio Recorder${NC} - Sistema de Grabación           ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}       con Transcripción Automática                     ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para verificar comandos
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2 instalado"
        return 0
    else
        echo -e "${RED}✗${NC} $2 no encontrado"
        return 1
    fi
}

# Función para verificar puerto
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Puerto en uso
    else
        return 0  # Puerto libre
    fi
}

# Función para encontrar puerto libre
find_free_port() {
    local port=$1
    while ! check_port $port; do
        port=$((port + 1))
    done
    echo $port
}

# Función de limpieza al salir
cleanup() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Cerrando ${APP_NAME}...${NC}"
    
    # Matar procesos específicos
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Servidor backend detenido"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✓${NC} Interfaz de usuario detenida"
    fi
    
    # Matar procesos huérfanos
    pkill -f "node.*backend/server.js" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null
    
    echo -e "${GREEN}✓${NC} Aplicación cerrada correctamente"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
}

# Capturar señales de salida
trap cleanup EXIT INT TERM

# Verificar dependencias del sistema
echo -e "${BLUE}▶${NC} Verificando requisitos del sistema..."
echo ""

all_deps_ok=true
check_command node "Node.js" || all_deps_ok=false
check_command npm "NPM" || all_deps_ok=false
check_command ffmpeg "FFmpeg" || all_deps_ok=false

echo ""

if [ "$all_deps_ok" = false ]; then
    echo -e "${RED}❌ Faltan dependencias del sistema${NC}"
    echo -e "${YELLOW}Por favor, instala las dependencias faltantes:${NC}"
    echo ""
    echo "  brew install node ffmpeg"
    echo ""
    read -p "Presiona Enter para salir..."
    exit 1
fi

# Verificar API key de OpenAI
echo -e "${BLUE}▶${NC} Verificando configuración..."
if [ -f "backend/.env" ]; then
    if grep -q "sk-proj" backend/.env; then
        echo -e "${GREEN}✓${NC} API key de OpenAI configurada"
        echo -e "${GREEN}✓${NC} Las transcripciones funcionarán correctamente"
    else
        echo -e "${YELLOW}⚠${NC}  API key de OpenAI no configurada"
        echo -e "    Las transcripciones no estarán disponibles"
    fi
else
    echo -e "${RED}✗${NC} Archivo .env no encontrado"
    echo -e "${YELLOW}Creando archivo de configuración...${NC}"
    echo "OPENAI_API_KEY=your_openai_api_key_here" > backend/.env
    echo "PORT=5001" >> backend/.env
fi

echo ""

# Verificar e instalar dependencias de Node si es necesario
if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Primera ejecución detectada${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ ! -d "backend/node_modules" ]; then
        echo -e "${BLUE}▶${NC} Instalando dependencias del servidor..."
        cd backend && npm install --silent && cd ..
        echo -e "${GREEN}✓${NC} Backend configurado"
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${BLUE}▶${NC} Instalando dependencias de la interfaz..."
        cd frontend && npm install --legacy-peer-deps --silent && cd ..
        echo -e "${GREEN}✓${NC} Frontend configurado"
    fi
    
    echo ""
fi

# Verificar puertos disponibles
echo -e "${BLUE}▶${NC} Verificando puertos..."

# Backend
if check_port $BACKEND_PORT; then
    echo -e "${GREEN}✓${NC} Puerto backend $BACKEND_PORT disponible"
else
    BACKEND_PORT=$(find_free_port $BACKEND_PORT)
    echo -e "${YELLOW}⚠${NC}  Puerto backend cambiado a $BACKEND_PORT"
fi

# Frontend
if check_port $FRONTEND_PORT; then
    echo -e "${GREEN}✓${NC} Puerto frontend $FRONTEND_PORT disponible"
    ACTUAL_FRONTEND_PORT=$FRONTEND_PORT
else
    ACTUAL_FRONTEND_PORT=$(find_free_port $((FRONTEND_PORT + 1)))
    echo -e "${YELLOW}⚠${NC}  Puerto frontend cambiado a $ACTUAL_FRONTEND_PORT"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Iniciando aplicación...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Iniciar backend
echo -e "${BLUE}▶${NC} Iniciando servidor backend..."
cd backend
PORT=$BACKEND_PORT node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Verificar que el backend inició correctamente
sleep 2
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Servidor backend iniciado (PID: $BACKEND_PID)"
else
    echo -e "${RED}❌ Error al iniciar el servidor backend${NC}"
    echo -e "${YELLOW}Revisa el archivo backend.log para más detalles${NC}"
    exit 1
fi

# Iniciar frontend
echo -e "${BLUE}▶${NC} Iniciando interfaz de usuario..."
cd frontend

# Configurar puerto y browser
export BROWSER=none  # No abrir navegador automáticamente todavía
export PORT=$ACTUAL_FRONTEND_PORT

# Iniciar React
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Esperar a que el frontend esté listo
echo -e "${BLUE}▶${NC} Esperando a que la interfaz esté lista..."
for i in {1..30}; do
    if curl -s http://localhost:$ACTUAL_FRONTEND_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Interfaz de usuario lista (PID: $FRONTEND_PID)"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# Verificar que ambos servicios estén funcionando
if kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${BOLD}✅ Aplicación iniciada correctamente${NC}                 ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📍 Accesos:${NC}"
    echo -e "   ${BOLD}Interfaz:${NC} http://localhost:$ACTUAL_FRONTEND_PORT"
    echo -e "   ${BOLD}Servidor:${NC} http://localhost:$BACKEND_PORT"
    echo ""
    echo -e "${MAGENTA}⌨️  Atajos:${NC}"
    echo -e "   ${BOLD}Ctrl+C${NC} - Detener aplicación"
    echo -e "   ${BOLD}Cmd+Tab${NC} - Cambiar entre ventanas"
    echo ""
    echo -e "${YELLOW}💡 Tip:${NC} Arrastra este archivo al Dock para acceso rápido"
    echo ""
    
    # Abrir navegador
    sleep 1
    echo -e "${BLUE}▶${NC} Abriendo navegador..."
    open "http://localhost:$ACTUAL_FRONTEND_PORT"
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}La aplicación está ejecutándose${NC}"
    echo -e "${YELLOW}Mantén esta ventana abierta mientras uses la app${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Mantener el script ejecutándose
    wait $BACKEND_PID $FRONTEND_PID
else
    echo -e "${RED}❌ Error al iniciar la aplicación${NC}"
    echo -e "${YELLOW}Revisa los archivos backend.log y frontend.log${NC}"
    exit 1
fi