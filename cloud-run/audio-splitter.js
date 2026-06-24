const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const CHUNK_DURATION = 180; // 3 minutos

async function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
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

async function splitAudioFile(inputPath, outputDir) {
  const stats = await fs.stat(inputPath);
  const fileSize = stats.size;

  console.log(`Tamaño del archivo: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

  if (fileSize < MAX_FILE_SIZE) {
    console.log('Archivo no necesita división (< 25MB)');
    return [inputPath];
  }

  console.log('Archivo grande, dividiéndolo en partes...');

  const duration = await getAudioDuration(inputPath);
  const targetChunkSize = 20 * 1024 * 1024;
  const bitrate = fileSize / duration;
  const optimalChunkDuration = Math.floor(targetChunkSize / bitrate);
  const chunkDuration = Math.min(optimalChunkDuration, CHUNK_DURATION);
  const finalChunkDuration =
    chunkDuration > 120 && bitrate > 300000 ? 120 : chunkDuration;

  const numChunks = Math.ceil(duration / finalChunkDuration);
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const chunks = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * finalChunkDuration;
    const chunkPath = path.join(outputDir, `${baseName}_part${i + 1}.mp3`);

    await new Promise((resolve, reject) => {
      console.log(`  Creando parte ${i + 1}/${numChunks}...`);

      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-ss', startTime.toString(),
        '-t', finalChunkDuration.toString(),
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-y',
        chunkPath,
      ]);

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          const chunkStats = await fs.stat(chunkPath);
          console.log(
            `    Chunk ${i + 1}: ${(chunkStats.size / 1024 / 1024).toFixed(2)}MB`
          );
          chunks.push(chunkPath);
          resolve();
        } else {
          reject(new Error(`Error al crear chunk ${i + 1}`));
        }
      });
    });
  }

  console.log(`Audio dividido en ${chunks.length} partes`);
  return chunks;
}

function combineTranscriptions(transcriptions) {
  return transcriptions.join(' ').trim();
}

module.exports = { splitAudioFile, combineTranscriptions, MAX_FILE_SIZE };
