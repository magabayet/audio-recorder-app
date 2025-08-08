#!/bin/bash

echo "========================================="
echo "🚀 Audio Recorder - Desktop App Builder"
echo "========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar comandos
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 no está instalado${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $1 instalado${NC}"
        return 0
    fi
}

# Verificar dependencias del sistema
echo -e "\n${YELLOW}1. Verificando dependencias del sistema...${NC}"
check_command node
check_command npm
check_command ffmpeg

# Verificar API key
echo -e "\n${YELLOW}2. Verificando configuración...${NC}"
if [ -f "backend/.env" ]; then
    if grep -q "your_openai_api_key_here" backend/.env; then
        echo -e "${YELLOW}⚠️  Advertencia: API key de OpenAI no configurada${NC}"
        echo "   Las transcripciones no funcionarán sin una API key válida"
    else
        echo -e "${GREEN}✓ API key configurada${NC}"
    fi
else
    echo -e "${RED}❌ Archivo .env no encontrado${NC}"
    echo "Creando archivo .env..."
    echo "OPENAI_API_KEY=your_openai_api_key_here" > backend/.env
    echo "PORT=5001" >> backend/.env
fi

# Instalar dependencias si no existen
echo -e "\n${YELLOW}3. Instalando dependencias...${NC}"

# Backend
if [ ! -d "backend/node_modules" ]; then
    echo "Instalando dependencias del backend..."
    cd backend && npm install && cd ..
else
    echo -e "${GREEN}✓ Dependencias del backend ya instaladas${NC}"
fi

# Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "Instalando dependencias del frontend..."
    cd frontend && npm install --legacy-peer-deps && cd ..
else
    echo -e "${GREEN}✓ Dependencias del frontend ya instaladas${NC}"
fi

# Instalar dependencias de Electron
echo -e "\n${YELLOW}4. Instalando Electron...${NC}"
npm install --save-dev electron electron-builder concurrently wait-on
npm install electron-is-dev

# Crear directorio de assets si no existe
echo -e "\n${YELLOW}5. Creando assets...${NC}"
mkdir -p assets

# Crear un ícono temporal si no existe
if [ ! -f "assets/icon.png" ]; then
    echo "Creando ícono temporal..."
    # Crear un ícono simple con ImageMagick si está disponible
    if command -v convert &> /dev/null; then
        convert -size 512x512 xc:'#667eea' \
                -fill white -gravity center \
                -pointsize 200 -annotate +0+0 '🎙️' \
                assets/icon.png
        echo -e "${GREEN}✓ Ícono creado${NC}"
    else
        echo -e "${YELLOW}⚠️  ImageMagick no instalado, usando ícono por defecto${NC}"
        # Crear un PNG básico manualmente
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > assets/icon.png
    fi
fi

# Crear entitlements para macOS
echo -e "\n${YELLOW}6. Creando configuración de permisos para macOS...${NC}"
cat > assets/entitlements.mac.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.microphone</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
EOF

# Copiar package-electron.json a package.json
echo -e "\n${YELLOW}7. Configurando package.json para Electron...${NC}"
cp package-electron.json package.json

# Construir el frontend
echo -e "\n${YELLOW}8. Construyendo frontend para producción...${NC}"
cd frontend
npm run build
cd ..

if [ -d "frontend/build" ]; then
    echo -e "${GREEN}✓ Frontend construido exitosamente${NC}"
else
    echo -e "${RED}❌ Error al construir el frontend${NC}"
    exit 1
fi

# Crear la aplicación
echo -e "\n${YELLOW}9. Empaquetando aplicación de escritorio...${NC}"
echo -e "${YELLOW}Esto puede tomar varios minutos...${NC}"

npm run dist

# Verificar resultado
if [ -d "dist" ]; then
    echo -e "\n${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ ¡Aplicación creada exitosamente!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo -e "\nLa aplicación se encuentra en:"
    ls -la dist/*.dmg 2>/dev/null && echo -e "${GREEN}✓ Instalador DMG creado${NC}"
    ls -la dist/*.zip 2>/dev/null && echo -e "${GREEN}✓ Archivo ZIP creado${NC}"
    echo -e "\n${YELLOW}Para instalar:${NC}"
    echo "1. Abre el archivo .dmg"
    echo "2. Arrastra 'Audio Recorder' a la carpeta Applications"
    echo "3. La primera vez, haz clic derecho y selecciona 'Abrir'"
else
    echo -e "${RED}❌ Error al crear la aplicación${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Notas importantes:${NC}"
echo "• La app necesita permisos de micrófono (se solicitarán al abrir)"
echo "• BlackHole debe estar instalado para grabar audio del sistema"
echo "• La API key de OpenAI debe estar configurada para transcripciones"