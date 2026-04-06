import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Download, Trash2, Play, Pause, Copy, FileText, Loader, Upload } from 'lucide-react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import AudioVisualizer from './components/AudioVisualizer';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import { onRecordingsChange, createRecording, deleteRecording as deleteRecordingDoc, type RecordingDoc } from './lib/firestore';
import { uploadAudio, getFileURL, deleteFile } from './lib/storage';
import './App.css';

const CLOUD_RUN_URL = process.env.REACT_APP_CLOUD_RUN_URL || 'http://localhost:8080';

function App() {
  const recorder = useMediaRecorder();
  const [recordings, setRecordings] = useState<RecordingDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playingURL, setPlayingURL] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reviewingFiles, setReviewingFiles] = useState<Set<string>>(new Set());
  const [showRevisedText, setShowRevisedText] = useState<Set<string>>(new Set());

  // Escuchar cambios en tiempo real de Firestore (reemplaza Socket.IO)
  useEffect(() => {
    const unsubscribe = onRecordingsChange((recs) => {
      setRecordings(recs);
    });
    return () => unsubscribe();
  }, []);

  // Mostrar errores del hook de grabación
  useEffect(() => {
    if (recorder.error) {
      setError(recorder.error);
    }
  }, [recorder.error]);

  const handleStartRecording = async () => {
    setError(null);
    await recorder.startRecording();
  };

  const handleStopRecording = async () => {
    const blob = await recorder.stopRecording();
    if (!blob) return;

    setIsUploading(true);
    setError(null);

    try {
      const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
      const fileName = `mic_recording_${Date.now()}.${extension}`;

      // Subir a Google Cloud Storage
      const { storagePath } = await uploadAudio(blob, fileName, (progress) => {
        setUploadProgress(progress);
      });

      // Crear documento en Firestore
      await createRecording({
        fileName,
        originalName: fileName,
        size: blob.size,
        mimeType: blob.type,
        storagePath,
      });

      setUploadProgress(0);
    } catch (err) {
      console.error('Error guardando grabación:', err);
      setError('Error al guardar la grabación');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const { storagePath } = await uploadAudio(file, file.name, (progress) => {
        setUploadProgress(progress);
      });

      await createRecording({
        fileName: `uploaded_${Date.now()}_${file.name}`,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        storagePath,
      });

      setUploadProgress(0);
    } catch (err) {
      setError('Error al subir el archivo');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (recording: RecordingDoc) => {
    try {
      // Eliminar archivos de Storage
      await deleteFile(recording.storagePath).catch(() => {});
      if (recording.transcription.storagePath) {
        await deleteFile(recording.transcription.storagePath).catch(() => {});
      }
      if (recording.revision.storagePath) {
        await deleteFile(recording.revision.storagePath).catch(() => {});
      }
      // Eliminar documento de Firestore
      await deleteRecordingDoc(recording.id);
    } catch (err) {
      setError('Error al eliminar la grabación');
    }
  };

  const handleTranscribe = async (recording: RecordingDoc) => {
    try {
      setError(null);
      const response = await fetch(`${CLOUD_RUN_URL}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId: recording.id,
          storagePath: recording.storagePath,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error al iniciar transcripción');
      }
      // El progreso se actualiza via Firestore onSnapshot
    } catch (err) {
      setError('Error al conectar con el servicio de transcripción');
    }
  };

  const handleReview = async (recording: RecordingDoc) => {
    if (!recording.transcription.text) return;

    try {
      setReviewingFiles(prev => new Set(Array.from(prev).concat(recording.id)));
      setError(null);

      const response = await fetch(`${CLOUD_RUN_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordingId: recording.id,
          text: recording.transcription.text,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error al revisar el texto');
      }
      // La actualización llega via Firestore onSnapshot
    } catch (err) {
      setError('Error al conectar con el servicio de revisión');
    } finally {
      setReviewingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(recording.id);
        return newSet;
      });
    }
  };

  const playAudio = async (recording: RecordingDoc) => {
    if (playingAudio === recording.id) {
      setPlayingAudio(null);
      setPlayingURL(null);
    } else {
      try {
        const url = await getFileURL(recording.storagePath);
        setPlayingURL(url);
        setPlayingAudio(recording.id);
      } catch (err) {
        setError('Error al reproducir audio');
      }
    }
  };

  const downloadAudio = async (recording: RecordingDoc) => {
    try {
      setDownloadingFile(recording.id);
      const url = await getFileURL(recording.storagePath);
      const link = document.createElement('a');
      link.href = url;
      link.download = recording.originalName || recording.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Error al descargar audio');
    } finally {
      setDownloadingFile(null);
    }
  };

  const downloadTranscription = async (recording: RecordingDoc, revised = false) => {
    try {
      setDownloadingFile(recording.id);
      const text = revised ? recording.revision.text : recording.transcription.text;
      if (!text) return;

      const blob = new Blob([text], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const suffix = revised ? '_revisado' : '';
      const fileName = recording.fileName.replace(/\.[^.]+$/, `${suffix}.txt`);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al descargar la transcripción');
    } finally {
      setDownloadingFile(null);
    }
  };

  const toggleTranscription = (id: string) => {
    setExpandedTranscriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleRevisedText = (id: string) => {
    setShowRevisedText(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCopy = (text: string) => {
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
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

    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const name = fileName.substring(0, lastDotIndex);
      const ext = fileName.substring(lastDotIndex);
      const maxNameLength = maxLength - ext.length - 3;
      if (name.length > maxNameLength) {
        return name.substring(0, maxNameLength) + '...' + ext;
      }
    }

    return fileName.substring(0, maxLength - 3) + '...';
  };

  const isTranscribing = (rec: RecordingDoc) => rec.transcription.status === 'processing';
  const hasTranscription = (rec: RecordingDoc) => rec.transcription.status === 'completed' && rec.transcription.text;
  const hasRevision = (rec: RecordingDoc) => rec.revision.status === 'completed' && rec.revision.text;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Audio Recorder con Transcripción</h1>
      </header>

      <main className="App-main">
        <div className="recording-section">
          <div className="recording-controls">
            {!recorder.isRecording ? (
              <button
                className="record-button"
                onClick={handleStartRecording}
                disabled={isUploading}
              >
                <Mic size={24} />
                Iniciar Grabación
              </button>
            ) : (
              <button
                className="stop-button"
                onClick={handleStopRecording}
              >
                <Square size={24} />
                Detener Grabación
              </button>
            )}

            {recorder.isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-time">{formatDuration(recorder.duration)}</span>
              </div>
            )}
          </div>

          {recorder.isRecording && (
            <div className="visualizer-container">
              <AudioVisualizer isRecording={recorder.isRecording} stream={recorder.stream} />
            </div>
          )}

          {isUploading && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <Loader size={20} className="spinning" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Guardando... {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : ''}
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

        {/* Panel de Progreso de Transcripción (via Firestore real-time) */}
        {recordings.some(r => isTranscribing(r)) && (
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
              Progreso de Transcripción
            </div>

            {recordings.filter(r => isTranscribing(r)).map((rec) => (
              <div key={rec.id} style={{
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
              }}>
                <div style={{ color: '#fff', fontSize: '13px', marginBottom: '4px' }}>
                  {rec.transcription.progressMessage || 'Procesando...'}
                </div>
                {rec.transcription.progress > 0 && (
                  <div style={{
                    height: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${rec.transcription.progress}%`,
                      height: '100%',
                      backgroundColor: '#4CAF50',
                      transition: 'width 0.5s ease',
                      borderRadius: '2px'
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="recordings-section">
          <h2>Grabaciones</h2>
          {recordings.length === 0 ? (
            <p className="no-recordings">No hay grabaciones aún</p>
          ) : (
            <div className="recordings-list">
              {recordings.map((recording) => (
                <div key={recording.id} className="recording-item-container">
                  <div className="recording-item">
                    <div className="recording-info">
                      <span className="recording-name" title={recording.fileName}>
                        {truncateFileName(recording.originalName || recording.fileName)}
                      </span>
                      <span className="recording-meta">
                        {formatFileSize(recording.size)} • {recording.createdAt?.toDate?.()
                          ? new Date(recording.createdAt.toDate()).toLocaleString()
                          : ''}
                      </span>
                    </div>
                    <div className="recording-actions">
                      {isTranscribing(recording) ? (
                        <div className="transcribing-indicator">
                          <Loader size={20} className="spinning" />
                          <span>Transcribiendo...</span>
                        </div>
                      ) : recording.transcription.status === 'error' ? (
                        <button
                          className="action-button transcribe"
                          onClick={() => handleTranscribe(recording)}
                          title="Reintentar transcripción"
                        >
                          <FileText size={20} />
                        </button>
                      ) : !hasTranscription(recording) ? (
                        <button
                          className="action-button transcribe"
                          onClick={() => handleTranscribe(recording)}
                          title="Transcribir"
                        >
                          <FileText size={20} />
                        </button>
                      ) : (
                        <button
                          className="action-button transcription-toggle"
                          onClick={() => toggleTranscription(recording.id)}
                          title="Ver transcripción"
                        >
                          <FileText size={20} />
                        </button>
                      )}

                      <button
                        className="action-button play"
                        onClick={() => playAudio(recording)}
                        title="Reproducir"
                      >
                        {playingAudio === recording.id ? <Pause size={20} /> : <Play size={20} />}
                      </button>

                      <button
                        className="action-button download"
                        onClick={() => downloadAudio(recording)}
                        title="Descargar audio"
                        disabled={downloadingFile === recording.id}
                      >
                        <Download size={20} />
                      </button>

                      <button
                        className="action-button delete"
                        onClick={() => handleDelete(recording)}
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Sección de transcripción expandida */}
                  {hasTranscription(recording) && expandedTranscriptions.has(recording.id) && (
                    <div className="transcription-section">
                      <div className="transcription-header">
                        <h4>Transcripción Original</h4>
                        <div className="transcription-actions">
                          <CopyToClipboard
                            text={recording.transcription.text!}
                            onCopy={() => handleCopy(recording.transcription.text!)}
                          >
                            <button className="transcription-button" title="Copiar texto original">
                              <Copy size={16} />
                              {copiedText === recording.transcription.text ? 'Copiado!' : 'Copiar'}
                            </button>
                          </CopyToClipboard>

                          {!hasRevision(recording) && !reviewingFiles.has(recording.id) && recording.revision.status !== 'processing' && (
                            <button
                              className="transcription-button"
                              onClick={() => handleReview(recording)}
                              title="Revisar y editar texto con IA"
                              style={{ backgroundColor: '#4CAF50' }}
                            >
                              <FileText size={16} />
                              Revisar y Editar Texto
                            </button>
                          )}

                          {(reviewingFiles.has(recording.id) || recording.revision.status === 'processing') && (
                            <button
                              className="transcription-button"
                              disabled
                              style={{ backgroundColor: '#666' }}
                            >
                              <Loader size={16} className="spinning" />
                              Revisando...
                            </button>
                          )}

                          {hasRevision(recording) && (
                            <button
                              className="transcription-button"
                              onClick={() => toggleRevisedText(recording.id)}
                              title={showRevisedText.has(recording.id) ? "Ver texto original" : "Ver texto revisado"}
                              style={{ backgroundColor: '#2196F3' }}
                            >
                              <FileText size={16} />
                              {showRevisedText.has(recording.id) ? 'Ver Original' : 'Ver Revisado'}
                            </button>
                          )}

                          <button
                            className="transcription-button"
                            onClick={() => downloadTranscription(recording)}
                            title="Descargar transcripción"
                            disabled={downloadingFile === recording.id}
                          >
                            {downloadingFile === recording.id ? (
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

                      {!showRevisedText.has(recording.id) ? (
                        <div className="transcription-text">
                          {recording.transcription.text}
                        </div>
                      ) : (
                        <>
                          <div style={{ marginTop: '20px' }}>
                            <div className="transcription-header">
                              <h4 style={{ color: '#4CAF50' }}>Texto Revisado y Editado</h4>
                              <div className="transcription-actions">
                                <CopyToClipboard
                                  text={recording.revision.text || ''}
                                  onCopy={() => handleCopy(recording.revision.text || '')}
                                >
                                  <button className="transcription-button" title="Copiar texto revisado">
                                    <Copy size={16} />
                                    {copiedText === recording.revision.text ? 'Copiado!' : 'Copiar Revisado'}
                                  </button>
                                </CopyToClipboard>

                                <button
                                  className="transcription-button"
                                  onClick={() => downloadTranscription(recording, true)}
                                  title="Descargar texto revisado"
                                  disabled={downloadingFile === recording.id}
                                  style={{ backgroundColor: '#4CAF50' }}
                                >
                                  {downloadingFile === recording.id ? (
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
                              {recording.revision.text}
                            </div>
                          </div>

                          <div style={{ marginTop: '20px' }}>
                            <div className="transcription-header">
                              <h4 style={{ color: '#888' }}>Transcripción Original</h4>
                            </div>
                            <div className="transcription-text" style={{ opacity: 0.7 }}>
                              {recording.transcription.text}
                            </div>
                          </div>
                        </>
                      )}

                      {recording.transcription.status === 'error' && (
                        <div style={{ color: '#f44336', marginTop: '10px', fontSize: '13px' }}>
                          Error: {recording.transcription.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {playingURL && (
          <audio
            src={playingURL}
            autoPlay
            onEnded={() => { setPlayingAudio(null); setPlayingURL(null); }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
