const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Whisper tiene un límite de 25MB por archivo
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB en bytes
const CHUNK_DURATION = 180; // 3 minutos por chunk (en segundos) - Más conservador para archivos de alta calidad

/**
 * Obtiene la duración de un archivo de audio usando ffprobe
 */
async function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let duration = '';
    ffprobe.stdout.on('data', (data) => {
      duration += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(duration));
      } else {
        reject(new Error('Error al obtener duración del audio'));
      }
    });
  });
}

/**
 * Divide un archivo de audio en chunks más pequeños
 */
async function splitAudioFile(inputPath, outputDir) {
  try {
    const stats = await fs.stat(inputPath);
    const fileSize = stats.size;
    
    console.log(`📊 Tamaño del archivo: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Si el archivo es menor a 25MB, no necesita división
    if (fileSize < MAX_FILE_SIZE) {
      console.log('✅ El archivo no necesita división (< 25MB)');
      return [inputPath];
    }
    
    console.log('⚠️  Archivo grande detectado, dividiéndolo en partes...');
    
    const duration = await getAudioDuration(inputPath);
    
    // Calcular duración óptima basada en el bitrate real del archivo
    // Para asegurar que cada chunk sea menor a 20MB (dejando mucho margen para metadatos y variaciones)
    const targetChunkSize = 20 * 1024 * 1024; // 20MB - más conservador
    const bitrate = fileSize / duration; // bytes por segundo
    const optimalChunkDuration = Math.floor(targetChunkSize / bitrate);
    
    // Usar el menor entre la duración calculada y 180 segundos (3 minutos)
    const chunkDuration = Math.min(optimalChunkDuration, CHUNK_DURATION);
    
    // Si aún así es muy grande, usar chunks de 2 minutos como máximo
    const finalChunkDuration = chunkDuration > 120 && bitrate > 300000 ? 120 : chunkDuration;
    
    console.log(`📐 Bitrate del archivo: ${(bitrate * 8 / 1000).toFixed(0)} kbps`);
    console.log(`⏱️  Duración óptima por chunk: ${Math.floor(finalChunkDuration / 60)}:${String(finalChunkDuration % 60).padStart(2, '0')} minutos`);
    
    const numChunks = Math.ceil(duration / finalChunkDuration);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const chunks = [];
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * finalChunkDuration;
      // Usar MP3 para los chunks temporales para reducir tamaño
      const chunkPath = path.join(outputDir, `${baseName}_part${i + 1}.mp3`);
      
      await new Promise((resolve, reject) => {
        console.log(`  Creando parte ${i + 1}/${numChunks}...`);
        
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputPath,
          '-ss', startTime.toString(),
          '-t', finalChunkDuration.toString(),
          '-acodec', 'libmp3lame',
          '-ab', '128k', // Bitrate de 128kbps para MP3
          '-ar', '44100',
          '-ac', '2',
          '-y', // Sobrescribir si existe
          chunkPath
        ]);
        
        ffmpeg.stderr.on('data', (data) => {
          // Opcionalmente log errores
          // console.log(data.toString());
        });
        
        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            // Verificar el tamaño del chunk creado
            const chunkStats = await fs.stat(chunkPath);
            const chunkSizeMB = chunkStats.size / (1024 * 1024);
            console.log(`    Tamaño del chunk ${i + 1}: ${chunkSizeMB.toFixed(2)}MB`);
            
            if (chunkSizeMB > 25) {
              console.warn(`    ⚠️ Chunk ${i + 1} excede 25MB, será rechazado por Whisper`);
            }
            
            chunks.push(chunkPath);
            resolve();
          } else {
            reject(new Error(`Error al crear chunk ${i + 1}`));
          }
        });
      });
    }
    
    console.log(`✅ Audio dividido en ${chunks.length} partes`);
    return chunks;
    
  } catch (error) {
    console.error('Error al dividir audio:', error);
    throw error;
  }
}

/**
 * Combina múltiples transcripciones en una sola
 */
function combineTranscriptions(transcriptions) {
  // Unir las transcripciones con un espacio
  // Whisper ya maneja bien la continuidad del contexto
  return transcriptions.join(' ').trim();
}

module.exports = {
  splitAudioFile,
  combineTranscriptions,
  MAX_FILE_SIZE,
  CHUNK_DURATION
};