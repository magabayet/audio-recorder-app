#!/bin/bash

# Audio Recorder - Script de inicio
echo "🎙️ Iniciando Audio Recorder con Transcripción..."

# Colores para la terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio base de la aplicación
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$APP_DIR"

# Función para verificar si un puerto está en uso
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Función para matar proceso en un puerto
kill_port() {
    local PORT=$1
    local PID=$(lsof -t -i:$PORT)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}⚠️  Cerrando proceso existente en puerto $PORT...${NC}"
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
}

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado. Por favor instálalo primero.${NC}"
    echo "Puedes descargarlo desde: https://nodejs.org/"
    exit 1
fi

# Verificar y liberar puertos si están ocupados
if check_port 5001; then
    echo -e "${YELLOW}Puerto 5001 está en uso${NC}"
    kill_port 5001
fi

if check_port 3000; then
    echo -e "${YELLOW}Puerto 3000 está en uso${NC}"
    kill_port 3000
fi

# Instalar dependencias si no existen
echo -e "${GREEN}📦 Verificando dependencias...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo "Instalando dependencias del backend..."
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Instalando dependencias del frontend..."
    cd frontend
    npm install
    cd ..
fi

# Crear archivo .env si no existe
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado. Creando uno nuevo...${NC}"
    echo "OPENAI_API_KEY=your_openai_api_key_here" > backend/.env
    echo "PORT=5001" >> backend/.env
    echo -e "${RED}⚠️  IMPORTANTE: Edita backend/.env y agrega tu API key de OpenAI${NC}"
fi

# Función para limpiar al salir
cleanup() {
    echo -e "\n${YELLOW}🛑 Cerrando aplicación...${NC}"
    # Matar procesos del backend y frontend
    kill_port 5001
    kill_port 3000
    # Matar procesos por nombre si existen
    pkill -f "node.*server.js" 2>/dev/null
    pkill -f "react-scripts start" 2>/dev/null
    exit 0
}

# Capturar señales de salida
trap cleanup EXIT INT TERM

# Iniciar el backend
echo -e "${GREEN}🚀 Iniciando servidor backend en puerto 5001...${NC}"
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
sleep 3

# Verificar si el backend está corriendo
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Error al iniciar el backend${NC}"
    exit 1
fi

# Iniciar el frontend
echo -e "${GREEN}🌐 Iniciando aplicación web en puerto 3000...${NC}"
cd frontend

# Configurar variable de entorno para no abrir el navegador automáticamente
export BROWSER=none

# Iniciar React
npm start &
FRONTEND_PID=$!
cd ..

# Esperar un poco para que todo se inicie
sleep 5

# Abrir el navegador
echo -e "${GREEN}🌍 Abriendo aplicación en el navegador...${NC}"
open http://localhost:3000

echo -e "${GREEN}✅ Aplicación iniciada correctamente!${NC}"
echo -e "${YELLOW}📝 Logs:${NC}"
echo "   - Backend corriendo en: http://localhost:5001"
echo "   - Frontend corriendo en: http://localhost:3000"
echo ""
echo -e "${YELLOW}Para detener la aplicación, presiona Ctrl+C${NC}"

# Mantener el script corriendo
wait