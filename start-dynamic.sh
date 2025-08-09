#!/bin/bash

# Audio Recorder - Script de inicio con puertos dinámicos
echo "🎙️ Iniciando Audio Recorder con Transcripción..."

# Colores para la terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio base de la aplicación
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$APP_DIR"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado. Por favor instálalo primero.${NC}"
    exit 1
fi

# Encontrar puertos disponibles
echo -e "${BLUE}🔍 Buscando puertos disponibles...${NC}"
PORTS_JSON=$(node find-ports.js)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al buscar puertos disponibles${NC}"
    exit 1
fi

# Extraer puertos del JSON
BACKEND_PORT=$(echo $PORTS_JSON | grep -o '"backend":[0-9]*' | cut -d':' -f2)
FRONTEND_PORT=$(echo $PORTS_JSON | grep -o '"frontend":[0-9]*' | cut -d':' -f2)

echo -e "${GREEN}✅ Puertos encontrados:${NC}"
echo -e "   Backend:  ${BLUE}$BACKEND_PORT${NC}"
echo -e "   Frontend: ${BLUE}$FRONTEND_PORT${NC}"

# Crear archivo de configuración temporal para el frontend
CONFIG_FILE="$APP_DIR/frontend/src/config.json"
echo "{
  \"BACKEND_URL\": \"http://localhost:$BACKEND_PORT\"
}" > "$CONFIG_FILE"

# Actualizar el archivo .env del backend temporalmente
if [ -f "backend/.env" ]; then
    # Guardar el puerto original
    ORIGINAL_PORT=$(grep "^PORT=" backend/.env | cut -d'=' -f2)
    # Actualizar con el nuevo puerto
    sed -i.bak "s/^PORT=.*/PORT=$BACKEND_PORT/" backend/.env
fi

# Función para limpiar al salir
cleanup() {
    echo -e "\n${YELLOW}🛑 Deteniendo aplicación...${NC}"
    
    # Restaurar el puerto original en .env si existe
    if [ -f "backend/.env.bak" ]; then
        mv backend/.env.bak backend/.env
    fi
    
    # Eliminar archivo de configuración temporal
    rm -f "$CONFIG_FILE"
    
    # Matar procesos
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    
    echo -e "${GREEN}✅ Aplicación detenida${NC}"
    exit 0
}

# Configurar trap para limpiar al salir
trap cleanup SIGINT SIGTERM EXIT

# Iniciar backend
echo -e "${GREEN}🚀 Iniciando backend en puerto $BACKEND_PORT...${NC}"
cd backend
PORT=$BACKEND_PORT npm start &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
echo -e "${YELLOW}⏳ Esperando a que el backend esté listo...${NC}"
for i in {1..30}; do
    if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend listo${NC}"
        break
    fi
    sleep 1
done

# Iniciar frontend
echo -e "${GREEN}🌐 Iniciando frontend en puerto $FRONTEND_PORT...${NC}"
cd frontend
PORT=$FRONTEND_PORT REACT_APP_BACKEND_PORT=$BACKEND_PORT npm start &
FRONTEND_PID=$!
cd ..

# Esperar a que el frontend compile
echo -e "${YELLOW}⏳ Esperando a que el frontend compile...${NC}"
sleep 10

# Abrir en el navegador
echo -e "${GREEN}🌍 Abriendo aplicación en el navegador...${NC}"
open "http://localhost:$FRONTEND_PORT"

# Mostrar información
echo -e "${GREEN}✅ Aplicación iniciada correctamente!${NC}"
echo -e "${YELLOW}📝 Información:${NC}"
echo -e "   Backend:  ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo -e "   Frontend: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo ""
echo -e "${YELLOW}Para detener la aplicación, presiona Ctrl+C${NC}"

# Mantener el script ejecutándose
wait