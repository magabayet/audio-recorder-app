import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Mic, Square, Download, Trash2, Play, Pause, Copy, FileText, Loader, Upload, Video, Users } from 'lucide-react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import AudioVisualizer from './components/AudioVisualizer';
import './App.css';

interface Recording {
  name: string;
  size: number;
  createdAt: string;
  path: string;
  transcription?: string | null;
  transcriptionPath?: string | null;
  revisedText?: string | null;
  revisedTextPath?: string | null;
  revisedAt?: string | null;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [transcribingFiles, setTranscribingFiles] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingSource, setRecordingSource] = useState<'mic' | 'zoom' | 'teams'>('mic');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressMessages, setProgressMessages] = useState<Array<{
    id: string;
    message: string;
    details: string;
    emoji: string;
    timestamp: Date;
    progress?: number;
  }>>([]);
  const [reviewingFiles, setReviewingFiles] = useState<Set<string>>(new Set());
  const [revisedTexts, setRevisedTexts] = useState<Map<string, string>>(new Map());
  const [showRevisedText, setShowRevisedText] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Obtener el puerto del backend desde variable de entorno o usar el default
    const backendPort = process.env.REACT_APP_BACKEND_PORT || '5001';
    const backendUrl = `http://localhost:${backendPort}`;
    console.log('Connecting to backend at:', backendUrl);
    
    const newSocket = io(backendUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('get-recordings');
    });

    newSocket.on('recording-started', (data) => {
      setCurrentRecordingId(data.id);
      setIsRecording(true);
      setError(null);
    });

    newSocket.on('recording-stopped', (data) => {
      setIsRecording(false);
      setRecordingDuration(0);
      newSocket.emit('get-recordings');
    });

    newSocket.on('recording-saved', (data) => {
      console.log('Recording saved:', data);
      newSocket.emit('get-recordings');
    });

    newSocket.on('transcription-started', (data) => {
      setTranscribingFiles(prev => new Set(Array.from(prev).concat(data.fileName)));
    });

    newSocket.on('transcription-completed', (data) => {
      setTranscribingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.fileName);
        return newSet;
      });
      // Limpiar mensajes de progreso después de 3 segundos
      setTimeout(() => {
        setProgressMessages([]);
      }, 3000);
      newSocket.emit('get-recordings');
    });

    newSocket.on('transcription-error', (data) => {
      setTranscribingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.fileName);
        return newSet;
      });
      // Limpiar mensajes de progreso en caso de error
      setTimeout(() => {
        setProgressMessages([]);
      }, 3000);
      setError(`Transcription error: ${data.error}`);
    });

    newSocket.on('recordings-list', (data) => {
      if (data.recordings) {
        setRecordings(data.recordings);
        
        // Cargar los textos revisados en el estado local
        const newRevisedTexts = new Map<string, string>();
        data.recordings.forEach((recording: Recording) => {
          if (recording.revisedText) {
            newRevisedTexts.set(recording.name, recording.revisedText);
          }
        });
        
        if (newRevisedTexts.size > 0) {
          setRevisedTexts(newRevisedTexts);
        }
      }
    });

    newSocket.on('recording-deleted', () => {
      newSocket.emit('get-recordings');
    });

    newSocket.on('recording-error', (data) => {
      setError(data.error);
      setIsRecording(false);
    });

    newSocket.on('file-uploaded', () => {
      newSocket.emit('get-recordings');
    });

    newSocket.on('progress-update', (data) => {
      setProgressMessages(prev => [...prev, {
        id: `${data.fileName}-${data.stage}-${Date.now()}-${Math.random()}`,
        message: data.message,
        details: data.details,
        emoji: data.emoji,
        timestamp: new Date(),
        progress: data.progress
      }]);

      // Limpiar mensajes antiguos después de 30 segundos
      setTimeout(() => {
        setProgressMessages(prev => prev.filter(msg => 
          new Date().getTime() - msg.timestamp.getTime() < 30000
        ));
      }, 30000);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
    if (socket) {
      socket.emit('start-recording', { source: recordingSource });
    }
  };

  const stopRecording = () => {
    if (socket && currentRecordingId) {
      socket.emit('stop-recording', { id: currentRecordingId });
    }
  };

  const deleteRecording = (fileName: string) => {
    if (socket) {
      socket.emit('delete-recording', { fileName });
    }
  };

  const transcribeRecording = (fileName: string) => {
    if (socket) {
      socket.emit('transcribe-recording', { fileName });
    }
  };

  const toggleTranscription = (fileName: string) => {
    setExpandedTranscriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  const downloadRevisedText = async (fileName: string) => {
    try {
      setDownloadingFile(fileName);
      const revisedFileName = fileName.replace('.wav', '_revised.txt')
        .replace('.mp3', '_revised.txt').replace('.mp4', '_revised.txt')
        .replace('.m4a', '_revised.txt').replace('.ogg', '_revised.txt')
        .replace('.webm', '_revised.txt').replace('.flac', '_revised.txt')
        .replace('.txt', '_revised.txt').replace('_revised_revised', '_revised');
      
      // Descargar la versión revisada
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '5001';
      const response = await fetch(`http://localhost:${backendPort}/download-transcription/${fileName}?revised=true`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Download error:', error);
        setError(`Error descargando texto revisado: ${error.error || 'Archivo no encontrado'}`);
        setTimeout(() => setError(null), 3000);
        setDownloadingFile(null);
        return;
      }
      
      // Convertir la respuesta a blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = revisedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Revised text downloaded successfully');
      setDownloadingFile(null);
    } catch (error) {
      console.error('Error downloading revised text:', error);
      setError('Error al descargar el texto revisado');
      setTimeout(() => setError(null), 3000);
      setDownloadingFile(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '5001';
      const response = await fetch(`http://localhost:${backendPort}/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Archivo subido:', result);
        // El socket listener actualizará la lista
      } else {
        setError(result.error || 'Error al subir el archivo');
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopy = (text: string) => {
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const reviewText = async (fileName: string, transcription: string) => {
    try {
      setReviewingFiles(prev => new Set(Array.from(prev).concat(fileName)));
      setError(null);
      
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '5001';
      const response = await fetch(`http://localhost:${backendPort}/api/review-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcription,
          fileName: fileName
        })
      });

      const result = await response.json();
      
      if (response.ok && result.revisedText) {
        setRevisedTexts(prev => new Map(prev).set(fileName, result.revisedText));
        setShowRevisedText(prev => new Set(Array.from(prev).concat(fileName)));
        
        // Actualizar la lista de recordings con el texto revisado
        setRecordings(prevRecordings => 
          prevRecordings.map(rec => 
            rec.name === fileName 
              ? { 
                  ...rec, 
                  revisedText: result.revisedText,
                  revisedTextPath: result.revisedPath,
                  revisedAt: new Date().toISOString()
                }
              : rec
          )
        );
        
        console.log('Texto revisado exitosamente');
        
        // Refrescar la lista de recordings desde el servidor
        if (socket) {
          socket.emit('get-recordings');
        }
      } else {
        setError(result.error || 'Error al revisar el texto');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Error al revisar texto:', error);
      setError('Error al conectar con el servidor para revisar el texto');
      setTimeout(() => setError(null), 5000);
    } finally {
      setReviewingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const toggleRevisedText = (fileName: string) => {
    setShowRevisedText(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  const downloadTranscription = async (fileName: string) => {
    try {
      setDownloadingFile(fileName);
      const transcriptionFileName = fileName.replace('.wav', '.txt')
        .replace('.mp3', '.txt').replace('.mp4', '.txt')
        .replace('.m4a', '.txt').replace('.ogg', '.txt')
        .replace('.webm', '.txt').replace('.flac', '.txt');
      
      // Verificar si el archivo existe antes de intentar descargarlo
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '5001';
      const response = await fetch(`http://localhost:${backendPort}/download-transcription/${fileName}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Download error:', error);
        setError(`Error descargando transcripción: ${error.error || 'Archivo no encontrado'}`);
        setTimeout(() => setError(null), 3000);
        setDownloadingFile(null);
        return;
      }
      
      // Convertir la respuesta a blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = transcriptionFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Transcription downloaded successfully');
      setDownloadingFile(null);
    } catch (error) {
      console.error('Error downloading transcription:', error);
      setError('Error al descargar la transcripción');
      setTimeout(() => setError(null), 3000);
      setDownloadingFile(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const truncateFileName = (fileName: string, maxLength: number = 50) => {
    if (fileName.length <= maxLength) return fileName;
    
    // Para archivos subidos, mantener el prefijo y extensión
    if (fileName.startsWith('uploaded_')) {
      const parts = fileName.match(/^(uploaded_\d+_)(.+)(\.\w+)$/);
      if (parts) {
        const [, prefix, name, ext] = parts;
        const maxNameLength = maxLength - prefix.length - ext.length - 3; // 3 for '...'
        if (name.length > maxNameLength) {
          return prefix + name.substring(0, maxNameLength) + '...' + ext;
        }
      }
    }
    
    // Para otros archivos, mantener extensión
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const name = fileName.substring(0, lastDotIndex);
      const ext = fileName.substring(lastDotIndex);
      const maxNameLength = maxLength - ext.length - 3;
      if (name.length > maxNameLength) {
        return name.substring(0, maxNameLength) + '...' + ext;
      }
    }
    
    // Fallback para archivos sin extensión
    return fileName.substring(0, maxLength - 3) + '...';
  };

  const playAudio = (path: string) => {
    if (playingAudio === path) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(path);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>System Audio Recorder con Transcripción</h1>
      </header>
      
      <main className="App-main">
        <div className="recording-section">
          {/* Selector de fuente de grabación */}
          <div className="source-selector" style={{ marginBottom: '20px' }}>
            <label style={{ marginRight: '10px' }}>Fuente de grabación:</label>
            <button 
              onClick={() => setRecordingSource('mic')}
              style={{ 
                backgroundColor: recordingSource === 'mic' ? '#4CAF50' : '#555',
                color: 'white',
                padding: '8px 16px',
                margin: '0 5px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              <Mic size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              Micrófono
            </button>
            <button 
              onClick={() => setRecordingSource('zoom')}
              style={{ 
                backgroundColor: recordingSource === 'zoom' ? '#2196F3' : '#555',
                color: 'white',
                padding: '8px 16px',
                margin: '0 5px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              <Video size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              Zoom
            </button>
            <button 
              onClick={() => setRecordingSource('teams')}
              style={{ 
                backgroundColor: recordingSource === 'teams' ? '#5B5FC7' : '#555',
                color: 'white',
                padding: '8px 16px',
                margin: '0 5px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              <Users size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              Teams
            </button>
          </div>

          <div className="recording-controls">
            {!isRecording ? (
              <button 
                className="record-button"
                onClick={startRecording}
                disabled={!socket}
              >
                <Mic size={24} />
                Iniciar Grabación
              </button>
            ) : (
              <button 
                className="stop-button"
                onClick={stopRecording}
              >
                <Square size={24} />
                Detener Grabación
              </button>
            )}
            
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-time">{formatDuration(recordingDuration)}</span>
              </div>
            )}
          </div>
          
          {isRecording && (
            <div className="visualizer-container">
              <AudioVisualizer isRecording={isRecording} />
            </div>
          )}
          
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}

          {/* Botón para subir archivos */}
          <div className="upload-section" style={{ marginTop: '20px' }}>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".wav,.mp3,.mp4,.m4a,.ogg,.webm,.flac"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="audio-upload"
            />
            <label 
              htmlFor="audio-upload"
              style={{ 
                backgroundColor: '#FF9800',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'inline-block',
                opacity: isUploading ? 0.6 : 1
              }}
            >
              {isUploading ? (
                <>
                  <Loader size={20} className="spinning" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Subir archivo de audio
                </>
              )}
            </label>
            <p style={{ fontSize: '12px', color: '#ccc', marginTop: '5px' }}>
              Formatos soportados: WAV, MP3, MP4, M4A, OGG, WebM, FLAC
            </p>
          </div>
        </div>

        {/* Panel de Progreso */}
        {progressMessages.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '400px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          }}>
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                fontSize: '20px',
                display: 'inline-block',
                animation: 'spin 2s linear infinite'
              }}>⚙️</span>
              Progreso de Procesamiento
              <span style={{
                display: 'inline-flex',
                gap: '2px',
                marginLeft: 'auto'
              }}>
                <span style={{ 
                  width: '4px', 
                  height: '4px', 
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                  animation: 'pulse 1.4s infinite',
                  animationDelay: '0s'
                }}/>
                <span style={{ 
                  width: '4px', 
                  height: '4px', 
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                  animation: 'pulse 1.4s infinite',
                  animationDelay: '0.2s'
                }}/>
                <span style={{ 
                  width: '4px', 
                  height: '4px', 
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                  animation: 'pulse 1.4s infinite',
                  animationDelay: '0.4s'
                }}/>
              </span>
            </div>
            
            {progressMessages.slice(-3).map((msg) => (
              <div key={msg.id} style={{
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                animation: 'slideIn 0.3s ease-out'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{ fontSize: '24px' }}>{msg.emoji}</span>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>
                    {msg.message}
                  </span>
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '11px',
                  marginLeft: '32px'
                }}>
                  {msg.details}
                </div>
                {msg.progress && (
                  <div style={{ 
                    marginTop: '6px',
                    marginLeft: '32px',
                    height: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${msg.progress}%`,
                      height: '100%',
                      backgroundColor: '#4CAF50',
                      transition: 'width 0.5s ease',
                      borderRadius: '2px'
                    }}/>
                  </div>
                )}
              </div>
            ))}
            
            <style>{`
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(10px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes spin {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
              @keyframes pulse {
                0%, 100% {
                  opacity: 0.3;
                  transform: scale(0.8);
                }
                50% {
                  opacity: 1;
                  transform: scale(1.2);
                }
              }
            `}</style>
          </div>
        )}

        <div className="recordings-section">
          <h2>Grabaciones</h2>
          {recordings.length === 0 ? (
            <p className="no-recordings">No hay grabaciones aún</p>
          ) : (
            <div className="recordings-list">
              {recordings.map((recording) => (
                <div key={recording.name} className="recording-item-container">
                  <div className="recording-item">
                    <div className="recording-info">
                      <span className="recording-name" title={recording.name}>
                        {truncateFileName(recording.name)}
                      </span>
                      <span className="recording-meta">
                        {formatFileSize(recording.size)} • {new Date(recording.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="recording-actions">
                      {transcribingFiles.has(recording.name) ? (
                        <div className="transcribing-indicator">
                          <Loader size={20} className="spinning" />
                          <span>Transcribiendo...</span>
                        </div>
                      ) : !recording.transcription ? (
                        <button
                          className="action-button transcribe"
                          onClick={() => transcribeRecording(recording.name)}
                          title="Transcribir"
                        >
                          <FileText size={20} />
                        </button>
                      ) : (
                        <button
                          className="action-button transcription-toggle"
                          onClick={() => toggleTranscription(recording.name)}
                          title="Ver transcripción"
                        >
                          <FileText size={20} />
                        </button>
                      )}
                      
                      <button
                        className="action-button play"
                        onClick={() => playAudio(recording.path)}
                        title="Reproducir"
                      >
                        {playingAudio === recording.path ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      
                      <a
                        href={`http://localhost:${process.env.REACT_APP_BACKEND_PORT || '5001'}${recording.path}`}
                        download={recording.name}
                        className="action-button download"
                        title="Descargar audio"
                      >
                        <Download size={20} />
                      </a>
                      
                      <button
                        className="action-button delete"
                        onClick={() => deleteRecording(recording.name)}
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  
                  {recording.transcription && expandedTranscriptions.has(recording.name) && (
                    <div className="transcription-section">
                      <div className="transcription-header">
                        <h4>Transcripción Original</h4>
                        <div className="transcription-actions">
                          <CopyToClipboard 
                            text={recording.transcription}
                            onCopy={() => handleCopy(recording.transcription!)}
                          >
                            <button className="transcription-button" title="Copiar texto original">
                              <Copy size={16} />
                              {copiedText === recording.transcription ? 'Copiado!' : 'Copiar'}
                            </button>
                          </CopyToClipboard>
                          
                          {!revisedTexts.has(recording.name) && !reviewingFiles.has(recording.name) && (
                            <button 
                              className="transcription-button"
                              onClick={() => reviewText(recording.name, recording.transcription!)}
                              title="Revisar y editar texto con IA"
                              style={{ backgroundColor: '#4CAF50' }}
                            >
                              <FileText size={16} />
                              Revisar y Editar Texto
                            </button>
                          )}
                          
                          {reviewingFiles.has(recording.name) && (
                            <button 
                              className="transcription-button"
                              disabled
                              style={{ backgroundColor: '#666' }}
                            >
                              <Loader size={16} className="spinning" />
                              Revisando...
                            </button>
                          )}
                          
                          {revisedTexts.has(recording.name) && (
                            <button 
                              className="transcription-button"
                              onClick={() => toggleRevisedText(recording.name)}
                              title={showRevisedText.has(recording.name) ? "Ver texto original" : "Ver texto revisado"}
                              style={{ backgroundColor: '#2196F3' }}
                            >
                              <FileText size={16} />
                              {showRevisedText.has(recording.name) ? 'Ver Original' : 'Ver Revisado'}
                            </button>
                          )}
                          
                          <button 
                            className="transcription-button"
                            onClick={() => downloadTranscription(recording.name)}
                            title="Descargar transcripción"
                            disabled={downloadingFile === recording.name}
                          >
                            {downloadingFile === recording.name ? (
                              <>
                                <Loader size={16} className="spinning" />
                                Descargando...
                              </>
                            ) : (
                              <>
                                <Download size={16} />
                                Descargar TXT
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {!showRevisedText.has(recording.name) ? (
                        <div className="transcription-text">
                          {recording.transcription}
                        </div>
                      ) : (
                        <>
                          <div style={{ marginTop: '20px' }}>
                            <div className="transcription-header">
                              <h4 style={{ color: '#4CAF50' }}>Texto Revisado y Editado</h4>
                              <div className="transcription-actions">
                                <CopyToClipboard 
                                  text={revisedTexts.get(recording.name) || ''}
                                  onCopy={() => handleCopy(revisedTexts.get(recording.name) || '')}
                                >
                                  <button className="transcription-button" title="Copiar texto revisado">
                                    <Copy size={16} />
                                    {copiedText === revisedTexts.get(recording.name) ? 'Copiado!' : 'Copiar Revisado'}
                                  </button>
                                </CopyToClipboard>
                                
                                <button 
                                  className="transcription-button"
                                  onClick={() => downloadRevisedText(recording.name)}
                                  title="Descargar texto revisado"
                                  disabled={downloadingFile === recording.name}
                                  style={{ backgroundColor: '#4CAF50' }}
                                >
                                  {downloadingFile === recording.name ? (
                                    <>
                                      <Loader size={16} className="spinning" />
                                      Descargando...
                                    </>
                                  ) : (
                                    <>
                                      <Download size={16} />
                                      Descargar Revisado
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="transcription-text" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50' }}>
                              {revisedTexts.get(recording.name)}
                            </div>
                          </div>
                          
                          <div style={{ marginTop: '20px' }}>
                            <div className="transcription-header">
                              <h4 style={{ color: '#888' }}>Transcripción Original</h4>
                            </div>
                            <div className="transcription-text" style={{ opacity: 0.7 }}>
                              {recording.transcription}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {playingAudio && (
          <audio
            src={`http://localhost:${process.env.REACT_APP_BACKEND_PORT || '5001'}${playingAudio}`}
            autoPlay
            onEnded={() => setPlayingAudio(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;