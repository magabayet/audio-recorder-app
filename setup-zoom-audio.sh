#!/bin/bash

echo "======================================"
echo "🎥 CONFIGURACIÓN DE AUDIO PARA ZOOM"
echo "======================================"
echo ""

# Función para crear dispositivo agregado
create_aggregate_device() {
    echo "📱 Creando dispositivo agregado para Zoom..."
    
    # Script de AppleScript para abrir Audio MIDI Setup
    osascript <<EOF
tell application "Audio MIDI Setup"
    activate
end tell

tell application "System Events"
    tell process "Audio MIDI Setup"
        delay 1
        -- Intentar crear un dispositivo agregado
        keystroke "n" using {command down, option down}
        delay 1
    end tell
end tell
EOF

    echo ""
    echo "✅ Audio MIDI Setup abierto"
    echo ""
    echo "INSTRUCCIONES MANUALES:"
    echo "----------------------"
    echo "1. En la ventana de Audio MIDI Setup:"
    echo "   - Haz clic en el botón '+' (abajo izquierda)"
    echo "   - Selecciona 'Crear dispositivo agregado'"
    echo ""
    echo "2. En el panel derecho, marca:"
    echo "   ✓ BlackHole 64ch (o BlackHole 2ch)"
    echo "   ✓ ZoomAudioDevice"
    echo "   ✓ Tu micrófono (Micrófono de MacBook Pro)"
    echo ""
    echo "3. Renombra el dispositivo como:"
    echo "   'Zoom+Sistema+Mic'"
    echo ""
    echo "4. Cierra Audio MIDI Setup cuando termines"
    echo ""
    read -p "Presiona ENTER cuando hayas completado estos pasos..."
}

# Función para configurar Zoom
configure_zoom() {
    echo ""
    echo "🎥 CONFIGURACIÓN EN ZOOM:"
    echo "-------------------------"
    echo ""
    echo "1. Abre Zoom"
    echo "2. Ve a: Zoom > Configuración > Audio"
    echo "3. Configura:"
    echo "   - Altavoz: 'ZoomAudioDevice' o 'Zoom+Sistema+Mic'"
    echo "   - Micrófono: Tu micrófono normal"
    echo ""
    echo "4. Marca: ✓ 'Usar audio original'"
    echo ""
}

# Función para probar la grabación
test_recording() {
    echo ""
    echo "🧪 PRUEBA DE GRABACIÓN"
    echo "----------------------"
    echo ""
    echo "Selecciona qué probar:"
    echo "1) ZoomAudioDevice directamente"
    echo "2) BlackHole 64ch"
    echo "3) Dispositivo agregado (si lo creaste)"
    echo "4) Todos los dispositivos (grabación de 3 segundos cada uno)"
    echo "5) Salir"
    
    read -p "Opción: " test_choice
    
    case $test_choice in
        1)
            echo "Grabando desde ZoomAudioDevice (3 segundos)..."
            ffmpeg -f avfoundation -i ":2" -t 3 -y test_zoom_direct.wav 2>/dev/null
            echo "✅ Grabación completada: test_zoom_direct.wav"
            echo "Reproduciendo..."
            afplay test_zoom_direct.wav
            ;;
        2)
            echo "Grabando desde BlackHole (3 segundos)..."
            ffmpeg -f avfoundation -i ":0" -t 3 -y test_blackhole.wav 2>/dev/null
            echo "✅ Grabación completada: test_blackhole.wav"
            echo "Reproduciendo..."
            afplay test_blackhole.wav
            ;;
        3)
            echo "Listando dispositivos para encontrar el agregado..."
            ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -A 20 "audio devices" | grep "\["
            echo ""
            read -p "Ingresa el número del dispositivo agregado: " agg_num
            echo "Grabando desde dispositivo $agg_num (3 segundos)..."
            ffmpeg -f avfoundation -i ":$agg_num" -t 3 -y test_aggregate.wav 2>/dev/null
            echo "✅ Grabación completada: test_aggregate.wav"
            echo "Reproduciendo..."
            afplay test_aggregate.wav
            ;;
        4)
            echo "Probando todos los dispositivos..."
            for i in 0 1 2 3 4; do
                echo "Grabando desde dispositivo $i..."
                ffmpeg -f avfoundation -i ":$i" -t 3 -y "test_device_$i.wav" 2>/dev/null
            done
            echo "✅ Todas las grabaciones completadas"
            echo "Archivos creados: test_device_*.wav"
            ;;
        5)
            return
            ;;
    esac
}

# Menú principal
while true; do
    echo ""
    echo "======================================"
    echo "MENÚ PRINCIPAL"
    echo "======================================"
    echo "1) Crear dispositivo agregado (Zoom+Sistema+Mic)"
    echo "2) Ver instrucciones de configuración de Zoom"
    echo "3) Probar grabación"
    echo "4) Diagnóstico completo"
    echo "5) Salir"
    echo ""
    read -p "Selecciona una opción: " choice
    
    case $choice in
        1)
            create_aggregate_device
            ;;
        2)
            configure_zoom
            ;;
        3)
            test_recording
            ;;
        4)
            echo ""
            echo "🔍 DIAGNÓSTICO COMPLETO"
            echo "----------------------"
            echo ""
            echo "Dispositivos disponibles:"
            ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -A 20 "audio devices" | grep "\["
            echo ""
            echo "Estado de BlackHole:"
            if ls /Library/Audio/Plug-Ins/HAL/ | grep -q "BlackHole"; then
                echo "✅ BlackHole instalado"
            else
                echo "❌ BlackHole NO instalado"
            fi
            echo ""
            echo "Procesos de Zoom activos:"
            ps aux | grep -i zoom | grep -v grep | head -3
            echo ""
            ;;
        5)
            echo "Saliendo..."
            exit 0
            ;;
        *)
            echo "Opción inválida"
            ;;
    esac
done