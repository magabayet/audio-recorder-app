# 🚀 Guía de Uso - Audio Recorder Launcher

## ✅ Todo está listo para usar

He configurado tu aplicación Audio Recorder con un launcher fácil de usar. Aquí están las opciones:

---

## 🎯 Opción A: Usar AudioRecorder.command (Recomendado)

### Para ejecutar la aplicación:

1. **Doble clic** en `AudioRecorder.command`
2. La primera vez, macOS te preguntará si confías en el archivo:
   - Haz clic derecho → Abrir
   - Click en "Abrir" en el diálogo

### Para agregar al Dock (acceso rápido):

1. **Arrastra** `AudioRecorder.command` directamente al Dock
2. Ahora puedes iniciar la app con un solo clic desde el Dock

---

## 🎯 Opción B: Usar AudioRecorder.app

He creado también una versión tipo aplicación:

1. **Doble clic** en `AudioRecorder.app`
2. O arrastra `AudioRecorder.app` al Dock

Esta versión abre Terminal automáticamente y ejecuta la aplicación.

---

## 📱 Qué esperar al iniciar

Cuando ejecutes cualquiera de las opciones:

1. **Se abrirá Terminal** con información del proceso:
   ```
   ╔════════════════════════════════════════════════════════╗
   ║  🎙️  Audio Recorder - Sistema de Grabación           ║
   ║       con Transcripción Automática                     ║
   ╚════════════════════════════════════════════════════════╝
   
   ▶ Verificando requisitos del sistema...
   ✓ Node.js instalado
   ✓ NPM instalado
   ✓ FFmpeg instalado
   
   ▶ Verificando configuración...
   ✓ API key de OpenAI configurada
   ✓ Las transcripciones funcionarán correctamente
   ```

2. **El navegador se abrirá automáticamente** con la interfaz

3. **Verás la aplicación funcionando** en http://localhost:3000

---

## 🛠️ Controles de la Aplicación

### En Terminal:
- **Ctrl+C**: Detener la aplicación
- **Mantén la ventana abierta** mientras uses la app

### En el Navegador:
- **Iniciar Grabación**: Click en el botón morado
- **Detener**: Click en el botón rojo
- **Ver Transcripción**: Click en el ícono de documento
- **Descargar**: Click en los botones de descarga

---

## 🔧 Solución de Problemas

### "No se puede abrir porque Apple no puede verificarlo"
```bash
# Opción 1: Clic derecho → Abrir
# Opción 2: En Terminal:
xattr -d com.apple.quarantine AudioRecorder.command
```

### El navegador no se abre automáticamente
- Abre manualmente: http://localhost:3000

### Error de puerto en uso
- El script detecta automáticamente puertos libres
- Si hay problemas, cierra otras aplicaciones Node

### No se transcriben los audios
- Verifica tu API key en `backend/.env`
- Asegúrate de tener créditos en OpenAI

---

## 💡 Tips Profesionales

1. **Acceso Ultra-Rápido**:
   - Agrega `AudioRecorder.command` al Dock
   - Asigna un atajo de teclado en Preferencias del Sistema

2. **Inicio Automático**:
   - Agrega a Elementos de Inicio de Sesión:
   - Preferencias → Usuarios → Elementos de inicio

3. **Crear Alias en Desktop**:
   ```bash
   ln -s /Users/miguelgabayetbodington/LOC_PROGRAM/JUL25/RECORDER/AudioRecorder.command ~/Desktop/Grabar\ Audio
   ```

---

## 📁 Ubicación de Archivos

- **Grabaciones**: `/recordings/`
- **Transcripciones**: `/transcriptions/`
- **Logs**: `backend.log` y `frontend.log`

---

## 🎉 ¡Listo para Usar!

Tu aplicación está completamente configurada. Solo necesitas:

1. **Doble clic** en `AudioRecorder.command`
2. **Esperar** que se abra el navegador
3. **Comenzar a grabar**

La API key ya está configurada, así que las transcripciones funcionarán automáticamente.

---

## 🆘 Necesitas Ayuda?

- Los logs están en `backend.log` y `frontend.log`
- La configuración está en `backend/.env`
- Para reinstalar dependencias: ejecuta `./setup.sh`