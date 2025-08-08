# 🎙️ Guía Completa - Grabación de Audio del Sistema

## ✅ Mejoras Implementadas

### 1. **Grabación de Audio del Sistema** 
La aplicación ahora puede grabar:
- 🎤 **Solo tu micrófono** (configuración actual)
- 🔊 **Audio del sistema** (Zoom, Teams, música, etc.)
- 🎙️ **Ambos combinados** (tu voz + sistema)

### 2. **Manejo de Archivos Largos**
- Automáticamente divide archivos > 25MB para Whisper
- Transcribe por partes y combina el resultado
- Ideal para reuniones largas de Zoom/Teams

### 3. **Interfaz Mejorada**
- Eliminado el mensaje de API key (ya está configurada)
- Detección automática del mejor dispositivo de audio

---

## 🚀 Configuración para Grabar Audio del Sistema

### **Paso 1: Instalar BlackHole** (Solo primera vez)

BlackHole es un driver de audio virtual necesario para capturar el audio del sistema.

```bash
# Ejecutar en Terminal:
./setup-system-audio.sh
```

Este script:
- Verificará si BlackHole está instalado
- Te ofrecerá instalarlo si no lo tienes
- Te mostrará los dispositivos disponibles

### **Paso 2: Configurar Audio del Sistema**

#### **Opción A: Solo Audio del Sistema** (Sin tu voz)
1. Ve a **Preferencias del Sistema → Sonido → Salida**
2. Selecciona **"BlackHole 2ch"**
3. ⚠️ Nota: No escucharás el audio mientras grabas

#### **Opción B: Sistema + Tu Voz + Escuchar** (RECOMENDADO para Zoom/Teams)

1. **Abrir Audio MIDI Setup**:
   - Presiona `Cmd + Espacio`
   - Escribe "Audio MIDI Setup"
   - Presiona Enter

2. **Crear Dispositivo de Salida Múltiple**:
   - Click en **"+"** (esquina inferior izquierda)
   - Selecciona **"Crear dispositivo de salida múltiple"**
   - Marca estas casillas:
     - ☑️ **Built-in Output** (para escuchar)
     - ☑️ **BlackHole 2ch** (para grabar)
   - En "Drift Correction", marca **BlackHole 2ch**

3. **Crear Dispositivo Agregado** (para incluir tu micrófono):
   - Click en **"+"** nuevamente
   - Selecciona **"Crear dispositivo agregado"**
   - Marca:
     - ☑️ **BlackHole 2ch**
     - ☑️ **Micrófono de MacBook Pro**
   - Cierra Audio MIDI Setup

4. **Configurar el Sistema**:
   - Ve a **Preferencias → Sonido → Salida**
   - Selecciona **"Dispositivo de salida múltiple"**

---

## 📱 Uso con Zoom/Teams

### **Para Zoom:**
1. En Zoom, ve a **Configuración → Audio**
2. **Micrófono**: Selecciona "Micrófono de MacBook Pro"
3. **Altavoz**: Mantén "Dispositivo de salida múltiple"
4. Inicia la grabación en Audio Recorder
5. ¡Listo! Se grabará toda la conversación

### **Para Teams:**
1. En Teams, ve a **Configuración → Dispositivos**
2. **Micrófono**: "Micrófono de MacBook Pro"
3. **Altavoz**: "Dispositivo de salida múltiple"
4. Inicia la grabación antes de la reunión

---

## 🎯 Verificar que Funciona

1. **Ejecutar diagnóstico**:
```bash
./diagnose-audio.sh
```

2. **Iniciar la aplicación**:
```bash
./AudioRecorder.command
```

3. **Ver en los logs del servidor**:
   - 🎙️ "Usando dispositivo agregado" = Graba sistema + micrófono
   - 🔊 "Usando BlackHole" = Solo audio del sistema
   - 🎤 "Usando micrófono" = Solo tu voz

---

## 📊 Archivos Largos (Reuniones > 1 hora)

La aplicación ahora maneja automáticamente archivos grandes:

- **< 25MB**: Transcripción directa
- **> 25MB**: División automática en partes de 10 minutos
- Las partes se transcriben secuencialmente
- El resultado final es un único archivo de texto completo

Ejemplo de lo que verás en los logs:
```
📁 Procesando archivo: recording_123456.wav (156.3MB)
📂 Archivo grande detectado, dividiéndolo para transcripción...
  Creando parte 1/3...
  Creando parte 2/3...
  Creando parte 3/3...
✅ Transcripción de archivo largo completada
```

---

## 🔧 Solución de Problemas

### No se graba el audio del sistema:
1. Verifica que BlackHole esté instalado: `brew list blackhole-2ch`
2. Verifica en Audio MIDI Setup que los dispositivos estén configurados
3. Asegúrate de seleccionar el dispositivo correcto en Preferencias → Sonido

### Solo se graba mi voz:
- La app está usando el micrófono directamente
- Necesitas configurar BlackHole (ver arriba)

### No escucho el audio mientras grabo:
- Asegúrate de usar "Dispositivo de salida múltiple" (no solo BlackHole)
- En el dispositivo múltiple, ambos (Built-in y BlackHole) deben estar marcados

### Error de transcripción en archivos largos:
- Verifica que tienes suficiente espacio en disco
- Los archivos temporales se crean en `recordings/temp/`
- Se eliminan automáticamente después de transcribir

---

## 💡 Tips Profesionales

1. **Para reuniones importantes**:
   - Inicia la grabación 1 minuto antes
   - Verifica el indicador de grabación (punto rojo)
   - Haz una prueba rápida hablando

2. **Calidad óptima**:
   - Usa auriculares para evitar eco
   - Cierra aplicaciones innecesarias
   - Mantén el volumen del sistema al 70-80%

3. **Transcripciones**:
   - Los archivos largos tardan más (aproximadamente 1 min por cada 10 min de audio)
   - La transcripción mantiene el contexto entre partes
   - Puedes descargar el .txt mientras se procesa

---

## ✅ Estado Actual

Tu aplicación está lista para:
- ✅ Grabar reuniones de Zoom/Teams completas
- ✅ Transcribir automáticamente (sin límite de duración)
- ✅ Capturar audio del sistema + tu voz
- ✅ Manejar archivos de cualquier tamaño

Para empezar, ejecuta:
```bash
./AudioRecorder.command
```

¡Tu API key ya está configurada y funcionando!