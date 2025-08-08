# Audio Recorder - Grabador de Audio del Sistema con Transcripción

Aplicación para grabar audio del sistema en macOS con transcripción automática usando OpenAI Whisper. Captura tanto el micrófono como los altavoces (incluyendo llamadas de Zoom y otras aplicaciones).

## Requisitos Previos

- macOS
- Node.js (v14 o superior)
- FFmpeg
- BlackHole (driver de audio virtual)
- API key de OpenAI (para transcripciones)

## Instalación

1. Configura tu API key de OpenAI:
```bash
cd backend
echo "OPENAI_API_KEY=tu_api_key_aqui" > .env
```

2. Ejecuta el script de instalación:
```bash
./setup.sh
```

Este script instalará todas las dependencias necesarias y te guiará en la configuración.

## Configuración de Audio en macOS

Para grabar el audio del sistema (no solo el micrófono), necesitas configurar un dispositivo de audio virtual:

### Paso 1: Instalar BlackHole
```bash
brew install blackhole-2ch
```

### Paso 2: Configurar Audio MIDI Setup
1. Abre la aplicación "Configuración de Audio MIDI" (Audio MIDI Setup)
2. Haz clic en el botón "+" en la esquina inferior izquierda
3. Selecciona "Crear dispositivo de salida múltiple"
4. En el panel derecho, marca:
   - Built-in Output (para escuchar el audio)
   - BlackHole 2ch (para capturar el audio)
5. Cierra la aplicación

### Paso 3: Configurar el dispositivo de salida
1. Ve a Preferencias del Sistema > Sonido
2. En la pestaña "Salida", selecciona "Dispositivo de salida múltiple"

## Uso

### Iniciar la aplicación:
```bash
npm run start
```

### Modo desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Características

- ✅ Grabación de audio del sistema completo
- ✅ Captura de micrófono y altavoces simultáneamente
- ✅ Transcripción automática con OpenAI Whisper
- ✅ Visualizador de audio en tiempo real durante la grabación
- ✅ Interfaz web intuitiva
- ✅ Visualización de grabaciones anteriores
- ✅ Descarga de archivos de audio y transcripciones
- ✅ Copiar texto transcrito al portapapeles
- ✅ Reproducción de grabaciones
- ✅ Persistencia de transcripciones
- ✅ Eliminación de grabaciones

## Estructura del Proyecto

```
RECORDER/
├── backend/                     # Servidor Node.js/Express
│   ├── server.js               # Servidor principal con Socket.IO y Whisper
│   ├── .env                    # Configuración de API keys
│   └── package.json            # Dependencias del backend
├── frontend/                    # Aplicación React
│   ├── src/
│   │   ├── App.tsx             # Componente principal
│   │   ├── App.css             # Estilos
│   │   └── components/
│   │       └── AudioVisualizer.tsx  # Visualizador de audio
│   └── package.json            # Dependencias del frontend
├── recordings/                  # Directorio de grabaciones de audio
├── transcriptions/              # Directorio de transcripciones
├── metadata.json               # Metadatos de grabaciones y transcripciones
├── setup.sh                    # Script de instalación
└── package.json                # Scripts del proyecto
```

## Solución de Problemas

### No se graba el audio del sistema
- Verifica que BlackHole esté instalado correctamente
- Asegúrate de que el "Dispositivo de salida múltiple" esté configurado
- Revisa los permisos de micrófono en Preferencias del Sistema > Seguridad y Privacidad

### Error de permisos
- La aplicación necesita permisos de micrófono
- Ve a Preferencias del Sistema > Seguridad y Privacidad > Privacidad > Micrófono
- Asegúrate de que Terminal o tu aplicación tenga permisos

### FFmpeg no encontrado
```bash
brew install ffmpeg
```

## Notas de Seguridad

- Las grabaciones se almacenan localmente en el directorio `recordings/`
- No se envían datos a servidores externos
- Asegúrate de cumplir con las leyes locales sobre grabación de audio