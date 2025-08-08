# Instrucciones de Uso - Audio Recorder con Transcripción

## 🚀 Inicio Rápido

### 1. Configurar API Key de OpenAI
```bash
cd backend
# Edita el archivo .env y reemplaza 'your_openai_api_key_here' con tu API key real
nano .env
```

### 2. Instalar dependencias (si no lo has hecho)
```bash
# En la carpeta principal del proyecto
cd /Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install --legacy-peer-deps
```

### 3. Iniciar la aplicación
```bash
# En la carpeta principal
cd /Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER
npm run start
```

La aplicación se abrirá en:
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

## 📋 Funcionalidades

### Grabación de Audio
1. Click en "Iniciar Grabación" para comenzar
2. Verás un visualizador de audio en tiempo real
3. Click en "Detener Grabación" para finalizar
4. El audio se guardará automáticamente

### Transcripción Automática
- Al finalizar la grabación, se transcribe automáticamente (requiere API key)
- Verás "Transcribiendo..." mientras se procesa
- Una vez completada, aparecerá el ícono de documento

### Ver Transcripciones
1. Click en el ícono de documento (📄) para expandir la transcripción
2. El texto aparecerá debajo del archivo

### Descargar Transcripciones
1. Expande la transcripción clickeando el ícono de documento
2. Click en "Descargar TXT"
3. El archivo .txt se descargará a tu carpeta de descargas

### Copiar Transcripciones
1. Expande la transcripción
2. Click en "Copiar"
3. Verás "Copiado!" cuando esté listo

## 🔧 Solución de Problemas

### Error al descargar transcripción
- Verifica que el archivo existe en la carpeta `transcriptions/`
- Asegúrate de que el servidor esté ejecutándose
- Revisa la consola del navegador (F12) para ver errores específicos

### No se transcribe automáticamente
- Verifica tu API key en el archivo `.env`
- Asegúrate de tener créditos en tu cuenta de OpenAI
- Revisa los logs del servidor en la terminal

### El visualizador no funciona
- Acepta los permisos de micrófono cuando el navegador lo solicite
- Verifica que no haya otras aplicaciones usando el micrófono

## 📁 Ubicación de Archivos

- **Grabaciones de audio**: `/recordings/`
- **Transcripciones**: `/transcriptions/`
- **Metadata**: `/metadata.json`

## 🧪 Archivo de Prueba

Ya tienes un archivo de prueba con transcripción:
- Archivo: `recording_1754459198125.wav`
- Transcripción: Disponible para descarga

## 💡 Tips

1. **Mejor calidad de audio**: Usa BlackHole para capturar audio del sistema
2. **Transcripciones en español**: Configurado por defecto para español
3. **Persistencia**: Todas las transcripciones se guardan permanentemente
4. **Historial**: Al abrir la app, verás todos los archivos anteriores