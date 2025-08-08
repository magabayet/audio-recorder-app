#!/bin/bash

# Script para alternar entre dispositivo de grabación y altavoces normales

current=$(osascript -e 'output volume of (get volume settings)')

# Obtener el dispositivo actual
current_device=$(osascript -e 'tell application "System Preferences"
    set current_output to do shell script "system_profiler SPAudioDataType | grep -A1 \"Default Output\" | tail -1 | cut -d: -f2 | xargs"
    return current_output
end tell' 2>/dev/null)

# Función para cambiar dispositivo de audio
switch_audio() {
    osascript -e "tell application \"System Preferences\"
        do shell script \"SwitchAudioSource -s '$1'\"
    end tell" 2>/dev/null
}

# Verificar si SwitchAudioSource está instalado
if ! command -v SwitchAudioSource &> /dev/null; then
    echo "Instalando SwitchAudioSource..."
    brew install switchaudio-osx
fi

# Obtener lista de dispositivos
devices=$(SwitchAudioSource -a -t output)

# Buscar dispositivos
multi_device=$(echo "$devices" | grep -i "múltiple\|multi\|grabación" | head -1)
speakers=$(echo "$devices" | grep -i "macbook\|speakers\|altavoces" | grep -v "múltiple" | head -1)

if [[ -z "$multi_device" ]] || [[ -z "$speakers" ]]; then
    echo "❌ No se encontraron los dispositivos necesarios"
    echo "Dispositivos disponibles:"
    echo "$devices"
    exit 1
fi

# Alternar entre dispositivos
if echo "$current_device" | grep -qi "múltiple\|multi"; then
    echo "🔊 Cambiando a altavoces normales (con control de volumen)..."
    SwitchAudioSource -s "$speakers"
    echo "✅ Ahora puedes ajustar el volumen"
else
    echo "🎙️ Cambiando a modo grabación..."
    SwitchAudioSource -s "$multi_device"
    echo "✅ Listo para grabar audio del sistema"
fi