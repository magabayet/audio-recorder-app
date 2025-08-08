#!/bin/bash

echo "========================================="
echo "🧪 Test del Launcher de Audio Recorder"
echo "========================================="
echo ""

# Verificar archivos
echo "✅ Archivos disponibles:"
echo ""

if [ -f "AudioRecorder.command" ]; then
    echo "  ✓ AudioRecorder.command (launcher principal)"
    echo "    Tamaño: $(du -h AudioRecorder.command | cut -f1)"
    echo "    Permisos: $(ls -l AudioRecorder.command | awk '{print $1}')"
fi

if [ -d "AudioRecorder.app" ]; then
    echo "  ✓ AudioRecorder.app (app launcher)"
    echo "    Tipo: Aplicación macOS"
fi

echo ""
echo "========================================="
echo "📋 Instrucciones para usar:"
echo "========================================="
echo ""
echo "OPCIÓN 1 (Más simple):"
echo "  • Haz doble clic en 'AudioRecorder.command'"
echo ""
echo "OPCIÓN 2 (Tipo app):"
echo "  • Haz doble clic en 'AudioRecorder.app'"
echo ""
echo "Para agregar al Dock:"
echo "  • Arrastra cualquiera de los dos al Dock"
echo ""
echo "========================================="
echo ""
read -p "¿Quieres probar el launcher ahora? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "Iniciando Audio Recorder..."
    ./AudioRecorder.command
fi