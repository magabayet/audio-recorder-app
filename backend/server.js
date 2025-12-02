const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const OpenAI = require('openai');
const FormData = require('form-data');
const multer = require('multer');
const { findBestAudioDevice } = require('./audio-devices');
const { splitAudioFile, combineTranscriptions } = require('./audio-splitter');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configurar CORS para aceptar múltiples orígenes
const allowedOrigins = [
  "http://localhost:4444",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:4444",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
];

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      console.log('Request from origin:', origin);
      // Permitir requests sin origin (ej. file://, Electron, apps móviles)
      if (!origin) return callback(null, true);
      
      // Permitir file:// protocol para Electron
      if (origin && origin.startsWith('file://')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Origin not in allowed list, but allowing anyway:', origin);
        callback(null, true); // Permitir todos los orígenes para Electron
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  : null;

// Configurar CORS para Express también
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // En desarrollo, permitir todos
    }
  },
  credentials: true
}));
app.use(express.json());
app.use('/recordings', express.static(path.join(__dirname, '../recordings')));
app.use('/transcriptions', express.static(path.join(__dirname, '../transcriptions')));

const recordingsDir = path.join(__dirname, '../recordings');
const transcriptionsDir = path.join(__dirname, '../transcriptions');

if (!fsSync.existsSync(recordingsDir)) {
  fsSync.mkdirSync(recordingsDir, { recursive: true });
}
if (!fsSync.existsSync(transcriptionsDir)) {
  fsSync.mkdirSync(transcriptionsDir, { recursive: true });
}

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, recordingsDir)
  },
  filename: function (req, file, cb) {
    const uniqueName = `uploaded_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName)
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Aceptar formatos de audio soportados por Whisper
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 
                         'audio/m4a', 'audio/ogg', 'audio/webm', 'audio/flac'];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(wav|mp3|mp4|m4a|mpeg|mpga|oga|ogg|webm|flac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado. Use: wav, mp3, mp4, m4a, ogg, webm, flac'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // Límite de 500MB
  }
});

let activeRecordings = new Map();
let recordingsMetadata = new Map();

async function loadMetadata() {
  const metadataPath = path.join(__dirname, '../metadata.json');
  try {
    const data = await fs.readFile(metadataPath, 'utf8');
    const parsed = JSON.parse(data);
    recordingsMetadata = new Map(Object.entries(parsed));
  } catch (error) {
    console.log('No metadata file found, starting fresh');
  }
}

async function saveMetadata() {
  const metadataPath = path.join(__dirname, '../metadata.json');
  const data = Object.fromEntries(recordingsMetadata);
  await fs.writeFile(metadataPath, JSON.stringify(data, null, 2));
}

loadMetadata();

async function transcribeAudio(audioFilePath, fileName, socket = null) {
  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in .env file');
    }

    // Verificar el tamaño del archivo y dividirlo si es necesario
    const stats = await fs.stat(audioFilePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    console.log(`📁 Procesando archivo: ${fileName} (${fileSizeMB.toFixed(2)}MB)`);
    
    // Enviar progreso inicial
    if (socket) {
      socket.emit('progress-update', {
        fileName,
        stage: 'analyzing',
        message: `📁 Analizando archivo: ${fileName}`,
        details: `Tamaño: ${fileSizeMB.toFixed(2)}MB`,
        emoji: '🔍'
      });
    }
    
    let transcriptionText = '';
    
    if (fileSizeMB > 24) {
      // Archivo grande, necesita división
      console.log('📂 Archivo grande detectado, dividiéndolo para transcripción...');
      
      if (socket) {
        socket.emit('progress-update', {
          fileName,
          stage: 'splitting',
          message: '📂 Archivo grande detectado',
          details: `Preparando división en partes más pequeñas...`,
          emoji: '✂️'
        });
      }
      
      // Crear directorio temporal único para cada transcripción
      const { v4: uuid } = require('uuid');
      const sessionId = uuid().substring(0, 8);
      const tempDir = path.join(recordingsDir, 'temp', sessionId);
      if (!fsSync.existsSync(tempDir)) {
        await fs.mkdir(tempDir, { recursive: true });
      }
      
      const chunks = await splitAudioFile(audioFilePath, tempDir);
      const transcriptions = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`  Transcribiendo parte ${i + 1}/${chunks.length}...`);
        
        if (socket) {
          socket.emit('progress-update', {
            fileName,
            stage: 'transcribing',
            message: `🎙️ Transcribiendo parte ${i + 1} de ${chunks.length}`,
            details: `Procesando audio con Whisper AI...`,
            emoji: '🤖',
            progress: Math.round(((i + 1) / chunks.length) * 100)
          });
        }
        
        const chunkFile = fsSync.createReadStream(chunks[i]);
        const chunkTranscription = await openai.audio.transcriptions.create({
          file: chunkFile,
          model: 'whisper-1',
          language: 'es',
          prompt: i > 0 ? transcriptions[i - 1].slice(-500) : undefined // Contexto de la parte anterior
        });
        
        transcriptions.push(chunkTranscription.text);
        
        // Eliminar el chunk temporal después de transcribir
        await fs.unlink(chunks[i]);
      }
      
      // Combinar todas las transcripciones
      transcriptionText = combineTranscriptions(transcriptions);
      console.log('✅ Transcripción de archivo largo completada');
      
      // Limpiar el directorio temporal
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.log('No se pudo eliminar directorio temporal:', e.message);
      }
      
    } else {
      // Archivo pequeño, transcripción directa
      const audioFile = fsSync.createReadStream(audioFilePath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'es'
      });
      
      transcriptionText = transcription.text;
    }

    // Guardar la transcripción
    const transcriptionFileName = fileName.replace('.wav', '.txt').replace('.mp3', '.txt')
      .replace('.mp4', '.txt').replace('.m4a', '.txt')
      .replace('.ogg', '.txt').replace('.webm', '.txt')
      .replace('.flac', '.txt');
    const transcriptionPath = path.join(transcriptionsDir, transcriptionFileName);
    
    await fs.writeFile(transcriptionPath, transcriptionText);
    
    // Enviar mensaje de éxito final
    if (socket) {
      socket.emit('progress-update', {
        fileName,
        stage: 'completed',
        message: '✅ Transcripción completada exitosamente',
        details: `${transcriptionText.split(' ').length} palabras transcritas`,
        emoji: '🎉'
      });
    }
    
    // Actualizar metadata
    recordingsMetadata.set(fileName, {
      audioPath: `/recordings/${fileName}`,
      transcriptionPath: `/transcriptions/${transcriptionFileName}`,
      transcription: transcriptionText,
      createdAt: new Date().toISOString(),
      size: stats.size,
      duration: stats.size / (44100 * 2 * 2) // Estimación aproximada
    });
    
    await saveMetadata();
    
    return {
      text: transcriptionText,
      path: `/transcriptions/${transcriptionFileName}`
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('start-recording', async (data) => {
    const recordingId = uuidv4();
    const source = data.source || 'mic';
    const fileName = `${source}_recording_${Date.now()}.wav`;
    const filePath = path.join(recordingsDir, fileName);
    
    console.log('Starting recording:', recordingId, 'Source:', source);
    
    // Detectar el dispositivo según la fuente seleccionada
    let audioDeviceIndex;
    let ffmpegInputFormat = 'avfoundation';
    let additionalInputArgs = [];
    
    if (source === 'zoom') {
      audioDeviceIndex = await findBestAudioDevice(false, true); // preferZoom = true
      // Para ZoomAudioDevice, usar configuración específica
      additionalInputArgs = ['-ac', '2']; // Forzar 2 canales
      console.log('🎥 Configurado para grabar Zoom');
      console.log('⚠️  IMPORTANTE: Asegúrate de que Zoom esté abierto y en una llamada');
    } else if (source === 'teams') {
      audioDeviceIndex = await findBestAudioDevice(false, false, true); // preferTeams = true
      additionalInputArgs = ['-ac', '2'];
      console.log('👥 Configurado para grabar Teams');
    } else {
      audioDeviceIndex = await findBestAudioDevice(); // Micrófono normal
      console.log('🎤 Configurado para grabar micrófono');
    }
    console.log('Using audio device index:', audioDeviceIndex);
    
    // Configurar parámetros de FFmpeg con manejo especial para dispositivos multicanal
    const ffmpegArgs = [
      '-f', ffmpegInputFormat,
      ...additionalInputArgs,
      '-i', `:${audioDeviceIndex}`,  // Usar el dispositivo detectado automáticamente
    ];
    
    // Si es BlackHole + Mic (65 canales), necesitamos remezclar a estéreo
    const devices = await require('./audio-devices').getAudioDevices();
    const currentDevice = devices.audio[audioDeviceIndex];
    
    if (currentDevice && currentDevice.name.includes('BlackHole + Mic')) {
      // Para dispositivos con múltiples canales, usar un filtro para remezclar
      ffmpegArgs.push(
        '-filter_complex', 'pan=stereo|FL<FL+0.5*FC|FR<FR+0.5*FC',
        '-acodec', 'pcm_s16le',
        '-ar', '44100'
      );
    } else if (currentDevice && currentDevice.name.includes('BlackHole 64ch')) {
      // Para BlackHole 64ch, tomar solo los primeros 2 canales
      ffmpegArgs.push(
        '-filter_complex', '[0:a]pan=stereo|c0=c0|c1=c1[out]',
        '-map', '[out]',
        '-acodec', 'pcm_s16le',
        '-ar', '44100'
      );
    } else {
      // Para dispositivos normales (micrófono estándar)
      ffmpegArgs.push(
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2'
      );
    }
    
    ffmpegArgs.push(filePath);
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    let audioLevels = [];
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('FFmpeg:', output);
      
      const levelMatch = output.match(/\[Parsed_volumedetect.*mean_volume: ([\-\d.]+) dB/);
      if (levelMatch) {
        const level = parseFloat(levelMatch[1]);
        socket.emit('audio-level', { level: Math.max(0, 100 + level) });
      }
    });

    ffmpeg.on('error', (error) => {
      console.error('FFmpeg error:', error);
      socket.emit('recording-error', { error: error.message });
    });

    ffmpeg.on('close', async (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
      if (code === 0) {
        socket.emit('recording-saved', { 
          id: recordingId, 
          fileName: fileName,
          path: `/recordings/${fileName}`
        });
        
        socket.emit('transcription-started', { fileName });
        
        try {
          const transcription = await transcribeAudio(filePath, fileName);
          socket.emit('transcription-completed', {
            fileName,
            transcription: transcription.text,
            transcriptionPath: transcription.path
          });
        } catch (error) {
          socket.emit('transcription-error', {
            fileName,
            error: error.message
          });
        }
      }
    });

    activeRecordings.set(recordingId, {
      process: ffmpeg,
      fileName: fileName,
      startTime: Date.now()
    });

    socket.emit('recording-started', { id: recordingId });
  });

  socket.on('stop-recording', (data) => {
    const { id } = data;
    const recording = activeRecordings.get(id);
    
    if (recording) {
      console.log('Stopping recording:', id);
      recording.process.stdin.write('q');
      recording.process.kill('SIGTERM');
      activeRecordings.delete(id);
      
      const duration = Date.now() - recording.startTime;
      socket.emit('recording-stopped', { 
        id: id, 
        duration: duration,
        fileName: recording.fileName
      });
    }
  });

  socket.on('get-recordings', async () => {
    try {
      const files = await fs.readdir(recordingsDir);
      
      const recordings = await Promise.all(
        files
          .filter(file => {
            // Filtrar por todas las extensiones soportadas
            const supportedExtensions = ['.wav', '.mp3', '.mp4', '.m4a', '.ogg', '.webm', '.flac'];
            return supportedExtensions.some(ext => file.toLowerCase().endsWith(ext));
          })
          .map(async file => {
            const stats = await fs.stat(path.join(recordingsDir, file));
            const metadata = recordingsMetadata.get(file) || {};
            
            return {
              name: file,
              size: stats.size,
              createdAt: stats.birthtime,
              path: `/recordings/${file}`,
              transcription: metadata.transcription || null,
              transcriptionPath: metadata.transcriptionPath || null,
              revisedText: metadata.revisedText || null,
              revisedTextPath: metadata.revisedTextPath || null,
              revisedAt: metadata.revisedAt || null
            };
          })
      );
      
      recordings.sort((a, b) => b.createdAt - a.createdAt);
      socket.emit('recordings-list', { recordings });
    } catch (err) {
      socket.emit('recordings-list', { error: err.message });
    }
  });

  socket.on('delete-recording', async (data) => {
    const { fileName } = data;
    const audioPath = path.join(recordingsDir, fileName);
    const transcriptionFileName = fileName.replace('.wav', '.txt')
      .replace('.mp3', '.txt').replace('.mp4', '.txt')
      .replace('.m4a', '.txt').replace('.ogg', '.txt')
      .replace('.webm', '.txt').replace('.flac', '.txt');
    const transcriptionPath = path.join(transcriptionsDir, transcriptionFileName);
    
    try {
      await fs.unlink(audioPath);
      
      try {
        await fs.unlink(transcriptionPath);
      } catch (e) {
        console.log('No transcription file to delete');
      }
      
      recordingsMetadata.delete(fileName);
      await saveMetadata();
      
      socket.emit('recording-deleted', { fileName });
    } catch (err) {
      socket.emit('delete-error', { error: err.message });
    }
  });

  socket.on('transcribe-recording', async (data) => {
    const { fileName } = data;
    const filePath = path.join(recordingsDir, fileName);
    
    socket.emit('transcription-started', { fileName });
    
    try {
      const transcription = await transcribeAudio(filePath, fileName, socket);
      socket.emit('transcription-completed', {
        fileName,
        transcription: transcription.text,
        transcriptionPath: transcription.path
      });
    } catch (error) {
      socket.emit('transcription-error', {
        fileName,
        error: error.message
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    activeRecordings.forEach((recording, id) => {
      recording.process.kill('SIGTERM');
    });
    activeRecordings.clear();
  });
});

// Endpoint para subir archivos de audio
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const fileInfo = {
      name: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: `/recordings/${req.file.filename}`,
      createdAt: new Date().toISOString()
    };

    // Guardar metadata
    recordingsMetadata.set(req.file.filename, {
      transcription: null,
      transcriptionPath: null
    });
    await saveMetadata();

    // Notificar a todos los clientes conectados
    io.emit('file-uploaded', fileInfo);

    res.json({
      success: true,
      file: fileInfo,
      message: 'Archivo subido exitosamente'
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ 
      error: 'Error al subir el archivo',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    openai_configured: !!openai
  });
});

app.get('/api/transcription-exists/:fileName', async (req, res) => {
  const transcriptionFileName = req.params.fileName.replace('.wav', '.txt')
    .replace('.mp3', '.txt').replace('.mp4', '.txt')
    .replace('.m4a', '.txt').replace('.ogg', '.txt')
    .replace('.webm', '.txt').replace('.flac', '.txt');
  const filePath = path.join(transcriptionsDir, transcriptionFileName);
  
  try {
    await fs.access(filePath);
    res.json({ exists: true, fileName: transcriptionFileName });
  } catch (error) {
    res.json({ exists: false, fileName: transcriptionFileName });
  }
});

app.get('/download-transcription/:fileName', async (req, res) => {
  const { fileName } = req.params;
  const { revised } = req.query;
  
  let transcriptionFileName;
  
  if (revised === 'true') {
    // Descargar versión revisada
    transcriptionFileName = fileName.replace('.wav', '_revised.txt')
      .replace('.mp3', '_revised.txt').replace('.mp4', '_revised.txt')
      .replace('.m4a', '_revised.txt').replace('.ogg', '_revised.txt')
      .replace('.webm', '_revised.txt').replace('.flac', '_revised.txt')
      .replace('.txt', '_revised.txt').replace('_revised_revised', '_revised');
  } else {
    // Descargar versión original
    transcriptionFileName = fileName.replace('.wav', '.txt')
      .replace('.mp3', '.txt').replace('.mp4', '.txt')
      .replace('.m4a', '.txt').replace('.ogg', '.txt')
      .replace('.webm', '.txt').replace('.flac', '.txt');
  }
  
  const filePath = path.join(transcriptionsDir, transcriptionFileName);
  
  console.log('Download request for:', fileName, revised ? '(revised)' : '(original)');
  console.log('Transcription file path:', filePath);
  
  try {
    await fs.access(filePath);
    res.download(filePath, transcriptionFileName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading file' });
      } else {
        console.log('File downloaded successfully:', transcriptionFileName);
      }
    });
  } catch (error) {
    console.error('File not found:', filePath);
    res.status(404).json({ error: 'Transcription not found', path: filePath });
  }
});

// Endpoint para revisar y editar texto con el agente de OpenAI
app.post('/api/review-text', async (req, res) => {
  try {
    const { text, fileName } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No se proporcionó texto para revisar' });
    }
    
    if (!openai) {
      return res.status(500).json({ error: 'OpenAI API no está configurada' });
    }
    
    console.log('📝 Iniciando revisión de texto para:', fileName || 'texto directo');
    console.log('Longitud del texto:', text.length, 'caracteres');
    
    // Enviar el texto al agente específico de OpenAI para revisión
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un editor profesional experto en corrección y mejora de textos transcritos. 
          Tu tarea es revisar y editar el texto proporcionado para:
          1. Corregir errores gramaticales y ortográficos
          2. Mejorar la claridad y coherencia
          3. Añadir puntuación adecuada
          4. Estructurar mejor los párrafos si es necesario
          5. Mantener el significado original del texto
          
          IMPORTANTE: Devuelve SOLO el texto revisado, sin comentarios adicionales ni explicaciones.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 4096
    });
    
    const revisedText = completion.choices[0].message.content;
    
    console.log('✅ Revisión completada exitosamente');
    console.log('Longitud del texto revisado:', revisedText.length, 'caracteres');
    
    // Si se proporcionó un nombre de archivo, guardar la versión revisada
    let revisedFileName = null;
    let revisedPath = null;
    
    if (fileName) {
      // Obtener el nombre base del archivo de audio
      const audioFileName = fileName.replace('.txt', '').replace('_revised', '')
        .replace('.wav', '').replace('.mp3', '').replace('.mp4', '')
        .replace('.m4a', '').replace('.ogg', '').replace('.webm', '').replace('.flac', '');
      
      // Buscar el archivo de audio original
      const files = await fs.readdir(recordingsDir);
      const audioFile = files.find(f => f.includes(audioFileName) && 
        (f.endsWith('.wav') || f.endsWith('.mp3') || f.endsWith('.mp4') || 
         f.endsWith('.m4a') || f.endsWith('.ogg') || f.endsWith('.webm') || f.endsWith('.flac')));
      
      revisedFileName = fileName.replace('.txt', '_revised.txt').replace('.wav', '_revised.txt')
        .replace('.mp3', '_revised.txt').replace('.mp4', '_revised.txt')
        .replace('.m4a', '_revised.txt').replace('.ogg', '_revised.txt')
        .replace('.webm', '_revised.txt').replace('.flac', '_revised.txt');
      revisedPath = path.join(transcriptionsDir, revisedFileName);
      await fs.writeFile(revisedPath, revisedText);
      console.log('💾 Versión revisada guardada en:', revisedPath);
      
      // Actualizar metadata con el texto revisado
      if (audioFile) {
        const metadata = recordingsMetadata.get(audioFile) || {};
        metadata.revisedText = revisedText;
        metadata.revisedTextPath = `/transcriptions/${revisedFileName}`;
        metadata.revisedAt = new Date().toISOString();
        recordingsMetadata.set(audioFile, metadata);
        await saveMetadata();
        console.log('📊 Metadata actualizada para:', audioFile);
      }
    }
    
    res.json({
      success: true,
      revisedText: revisedText,
      revisedFileName: revisedFileName,
      revisedPath: revisedPath ? `/transcriptions/${revisedFileName}` : null,
      originalLength: text.length,
      revisedLength: revisedText.length
    });
    
  } catch (error) {
    console.error('Error al revisar texto:', error);
    res.status(500).json({ 
      error: 'Error al revisar el texto',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});