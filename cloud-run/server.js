const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const OpenAI = require('openai');
const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');
const { splitAudioFile, combineTranscriptions } = require('./audio-splitter');

const app = express();
app.use(cors());
app.use(express.json());

const gcs = new Storage();
const firestore = new Firestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const RECORDINGS_COLLECTION = 'recordings';
const TMP_DIR = '/tmp';

/**
 * Actualiza el progreso de transcripción en Firestore (el frontend escucha con onSnapshot)
 */
async function updateProgress(recordingId, data) {
  const updates = {};
  for (const [key, value] of Object.entries(data)) {
    updates[`transcription.${key}`] = value;
  }
  await firestore
    .collection(RECORDINGS_COLLECTION)
    .doc(recordingId)
    .update(updates);
}

/**
 * Descarga un archivo de GCS a /tmp
 */
async function downloadFromGCS(storagePath) {
  const localPath = path.join(TMP_DIR, `${uuidv4()}_${path.basename(storagePath)}`);
  await gcs.bucket(BUCKET_NAME).file(storagePath).download({ destination: localPath });
  return localPath;
}

/**
 * Sube un archivo de /tmp a GCS
 */
async function uploadToGCS(localPath, storagePath) {
  await gcs.bucket(BUCKET_NAME).upload(localPath, { destination: storagePath });
  return `gs://${BUCKET_NAME}/${storagePath}`;
}

/**
 * Transcribe un archivo de audio con Whisper API (con splitting si es necesario)
 */
async function transcribeAudio(localFilePath, recordingId) {
  const stats = await fs.stat(localFilePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  console.log(`Procesando: ${path.basename(localFilePath)} (${fileSizeMB.toFixed(2)}MB)`);

  await updateProgress(recordingId, {
    status: 'processing',
    progress: 5,
    progressMessage: `Analizando archivo (${fileSizeMB.toFixed(1)}MB)`,
  });

  let transcriptionText = '';

  if (fileSizeMB > 24) {
    // Archivo grande: dividir en chunks
    const tempDir = path.join(TMP_DIR, uuidv4().substring(0, 8));
    if (!fsSync.existsSync(tempDir)) {
      await fs.mkdir(tempDir, { recursive: true });
    }

    await updateProgress(recordingId, {
      progress: 10,
      progressMessage: 'Dividiendo archivo en partes...',
    });

    const chunks = await splitAudioFile(localFilePath, tempDir);
    const transcriptions = [];

    for (let i = 0; i < chunks.length; i++) {
      const progressPct = 10 + Math.round(((i + 1) / chunks.length) * 80);

      await updateProgress(recordingId, {
        progress: progressPct,
        progressMessage: `Transcribiendo parte ${i + 1} de ${chunks.length}`,
      });

      const chunkFile = fsSync.createReadStream(chunks[i]);
      const result = await openai.audio.transcriptions.create({
        file: chunkFile,
        model: 'whisper-1',
        language: 'es',
        prompt: i > 0 ? transcriptions[i - 1].slice(-500) : undefined,
      });

      transcriptions.push(result.text);
      await fs.unlink(chunks[i]);
    }

    transcriptionText = combineTranscriptions(transcriptions);

    // Limpiar directorio temporal
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.log('No se pudo eliminar directorio temporal:', e.message);
    }
  } else {
    // Archivo pequeño: transcripción directa
    await updateProgress(recordingId, {
      progress: 20,
      progressMessage: 'Transcribiendo audio...',
    });

    const audioFile = fsSync.createReadStream(localFilePath);
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
    });

    transcriptionText = result.text;
  }

  return transcriptionText;
}

// ──────────────────────────────────────
// Endpoints
// ──────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /transcribe
 * Body: { recordingId, storagePath }
 * Descarga el audio de GCS, lo transcribe, sube el .txt a GCS y actualiza Firestore.
 */
app.post('/transcribe', async (req, res) => {
  const { recordingId, storagePath } = req.body;

  if (!recordingId || !storagePath) {
    return res.status(400).json({ error: 'recordingId y storagePath son requeridos' });
  }

  // CRÍTICO: Cloud Run mata procesos en background después de enviar la respuesta HTTP.
  // Por eso la transcripción DEBE ser síncrona — no respondemos hasta que termine.
  // Firestore se actualiza durante el proceso para que el frontend vea progreso en tiempo real.

  try {
    await updateProgress(recordingId, {
      status: 'processing',
      progress: 0,
      progressMessage: 'Iniciando transcripción...',
    });
  } catch (firestoreError) {
    console.error('Error al actualizar Firestore:', firestoreError);
    return res.status(500).json({ error: 'No se pudo iniciar la transcripción' });
  }

  try {
    // Descargar de GCS a /tmp
    const localPath = await downloadFromGCS(storagePath);

    // Transcribir (actualiza progreso en Firestore durante el proceso)
    const text = await transcribeAudio(localPath, recordingId);

    // Guardar transcripción en /tmp y subir a GCS
    const txtFileName = path.basename(storagePath).replace(/\.[^.]+$/, '.txt');
    const localTxtPath = path.join(TMP_DIR, txtFileName);
    await fs.writeFile(localTxtPath, text);

    const txtStoragePath = `transcriptions/${recordingId}/${txtFileName}`;
    await uploadToGCS(localTxtPath, txtStoragePath);

    // Actualizar Firestore con resultado final
    await updateProgress(recordingId, {
      status: 'completed',
      text: text,
      storagePath: txtStoragePath,
      progress: 100,
      progressMessage: 'Transcripción completada',
      completedAt: new Date(),
    });

    // Limpiar archivos temporales
    await fs.unlink(localPath).catch(() => {});
    await fs.unlink(localTxtPath).catch(() => {});

    console.log(`Transcripción completada para ${recordingId}`);

    // Responder SOLO cuando todo terminó — Cloud Run mantiene el CPU activo
    res.json({ status: 'completed', recordingId });
  } catch (error) {
    console.error('Error en transcripción:', error);
    try {
      await updateProgress(recordingId, {
        status: 'error',
        error: error.message,
        progressMessage: `Error: ${error.message}`,
      });
    } catch (firestoreError) {
      console.error('CRÍTICO: No se pudo escribir el error en Firestore:', firestoreError);
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /review
 * Body: { recordingId, text }
 * Revisa el texto con GPT-4o-mini, sube la versión revisada a GCS y actualiza Firestore.
 */
app.post('/review', async (req, res) => {
  const { recordingId, text } = req.body;

  if (!recordingId || !text) {
    return res.status(400).json({ error: 'recordingId y text son requeridos' });
  }

  try {
    // Actualizar estado
    const revisionUpdates = {};
    revisionUpdates['revision.status'] = 'processing';
    await firestore
      .collection(RECORDINGS_COLLECTION)
      .doc(recordingId)
      .update(revisionUpdates);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un editor profesional experto en corrección y mejora de textos transcritos.
          Tu tarea es revisar y editar el texto proporcionado para:
          1. Corregir errores gramaticales y ortográficos
          2. Mejorar la claridad y coherencia
          3. Añadir puntuación adecuada
          4. Estructurar mejor los párrafos si es necesario
          5. Mantener el significado original del texto

          IMPORTANTE: Devuelve SOLO el texto revisado, sin comentarios adicionales ni explicaciones.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const revisedText = completion.choices[0].message.content;

    // Subir versión revisada a GCS
    const revisedFileName = `revised_${recordingId}.txt`;
    const localRevisedPath = path.join(TMP_DIR, revisedFileName);
    await fs.writeFile(localRevisedPath, revisedText);

    const revisedStoragePath = `transcriptions/${recordingId}/${revisedFileName}`;
    await uploadToGCS(localRevisedPath, revisedStoragePath);

    // Actualizar Firestore
    const finalUpdates = {};
    finalUpdates['revision.status'] = 'completed';
    finalUpdates['revision.text'] = revisedText;
    finalUpdates['revision.storagePath'] = revisedStoragePath;
    finalUpdates['revision.completedAt'] = new Date();
    await firestore
      .collection(RECORDINGS_COLLECTION)
      .doc(recordingId)
      .update(finalUpdates);

    // Limpiar
    await fs.unlink(localRevisedPath).catch(() => {});

    res.json({ success: true, revisedText });
  } catch (error) {
    console.error('Error en revisión:', error);

    const errorUpdates = {};
    errorUpdates['revision.status'] = 'error';
    await firestore
      .collection(RECORDINGS_COLLECTION)
      .doc(recordingId)
      .update(errorUpdates)
      .catch(() => {});

    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Cloud Run transcription service running on port ${PORT}`);
});
