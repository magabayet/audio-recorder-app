const fs = require('fs');
const path = require('path');

// Crear una transcripción de prueba
const transcriptionsDir = path.join(__dirname, 'transcriptions');
const testFileName = 'recording_1754459198125.txt';
const testContent = 'Esta es una transcripción de prueba para verificar la funcionalidad de descarga.';

// Asegurarse de que el directorio existe
if (!fs.existsSync(transcriptionsDir)) {
  fs.mkdirSync(transcriptionsDir, { recursive: true });
  console.log('✅ Directorio de transcripciones creado');
}

// Crear archivo de prueba
const filePath = path.join(transcriptionsDir, testFileName);
fs.writeFileSync(filePath, testContent);
console.log('✅ Archivo de transcripción de prueba creado:', filePath);

// Verificar que el archivo existe
if (fs.existsSync(filePath)) {
  console.log('✅ Archivo verificado exitosamente');
  console.log('📝 Contenido:', fs.readFileSync(filePath, 'utf8'));
  
  // También actualizar metadata si existe
  const metadataPath = path.join(__dirname, 'metadata.json');
  let metadata = {};
  
  if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }
  
  metadata['recording_1754459198125.wav'] = {
    audioPath: '/recordings/recording_1754459198125.wav',
    transcriptionPath: '/transcriptions/recording_1754459198125.txt',
    transcription: testContent,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('✅ Metadata actualizada');
} else {
  console.log('❌ Error: No se pudo crear el archivo');
}

console.log('\n📌 Ahora puedes probar la descarga desde la aplicación');
console.log('   El archivo debería estar disponible para: recording_1754459198125.wav');