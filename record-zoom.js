#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🎥 Grabador de Zoom - Audio Recorder');
console.log('=====================================\n');

const recordingsDir = path.join(__dirname, 'recordings');
const fileName = `zoom_recording_${Date.now()}.wav`;
const filePath = path.join(recordingsDir, fileName);

console.log('📌 IMPORTANTE: Asegúrate de que Zoom esté abierto ANTES de iniciar la grabación\n');
console.log('Grabando desde ZoomAudioDevice...');
console.log('Presiona Ctrl+C para detener la grabación\n');

// Usar ZoomAudioDevice (índice 3 según tus logs)
const ffmpeg = spawn('ffmpeg', [
  '-f', 'avfoundation',
  '-i', ':3',  // ZoomAudioDevice
  '-acodec', 'pcm_s16le',
  '-ar', '44100',
  '-ac', '2',
  filePath
]);

ffmpeg.stderr.on('data', (data) => {
  // Solo mostrar errores importantes
  const output = data.toString();
  if (output.includes('error') || output.includes('Error')) {
    console.error('Error:', output);
  }
});

ffmpeg.on('close', (code) => {
  if (code === 0 || code === 255) {
    console.log(`\n✅ Grabación guardada: ${fileName}`);
    console.log(`📁 Ubicación: ${filePath}`);
    
    // Verificar tamaño del archivo
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`📊 Tamaño: ${fileSizeInMB.toFixed(2)} MB`);
    
    if (fileSizeInMB > 0.1) {
      console.log('\n🎯 Para transcribir esta grabación:');
      console.log('1. Abre http://localhost:3000');
      console.log('2. Busca el archivo en la lista');
      console.log('3. Haz clic en "Transcribir"');
    } else {
      console.log('\n⚠️  El archivo parece estar vacío. Verifica que Zoom estaba activo.');
    }
  } else {
    console.log(`\n❌ Error en la grabación (código: ${code})`);
  }
});

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  Deteniendo grabación...');
  ffmpeg.stdin.write('q');
  ffmpeg.kill('SIGTERM');
});