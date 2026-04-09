import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Download, Trash2, Play, Pause, Copy, FileText, Loader, Upload, X, AlertCircle, CheckCircle, Info, LogOut, Settings } from 'lucide-react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import AudioVisualizer from './components/AudioVisualizer';
import LoginScreen from './components/LoginScreen';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import { onRecordingsChange, createRecording, deleteRecording as deleteRecordingDoc, type RecordingDoc } from './lib/firestore';
import { uploadAudio, getFileURL, deleteFile } from './lib/storage';
import { onAuthChange, signOut, getIdToken } from './lib/auth';
import type { User } from 'firebase/auth';
import './App.css';

const CLOUD_RUN_URL = process.env.REACT_APP_CLOUD_RUN_URL || 'http://localhost:8080';

// ─── Sistema de Toasts ───────────────────────────────────────────

interface Toast {
  id: string;
  type: 'info' | 'success' | 'error' | 'loading';
  message: string;
  detail?: string;
  persistent?: boolean;
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    if (!toast.persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.type === 'error' ? 6000 : 4000);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    // Si se actualiza a un tipo no-persistente, auto-remover
    if (updates.persistent === false || (updates.type && updates.type !== 'loading')) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, updates.type === 'error' ? 6000 : 4000);
    }
  }, []);

  return { toasts, addToast, removeToast, updateToast };
}

// ─── App ─────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Escuchar estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  // Pantalla de carga mientras se verifica auth
  if (authLoading) {
    return (
      <div className="App" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={32} className="spinning" />
      </div>
    );
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    return <LoginScreen onLogin={() => {}} />;
  }

  return <AppContent user={user} onSignOut={handleSignOut} />;
}

// ─── Contenido principal (solo visible si está autenticado) ──────

function AppContent({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const recorder = useMediaRecorder();
  const [recordings, setRecordings] = useState<RecordingDoc[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playingURL, setPlayingURL] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRevisedText, setShowRevisedText] = useState<Set<string>>(new Set());

  // Estados locales inmediatos (no dependen de Firestore)
  const [pendingTranscriptions, setPendingTranscriptions] = useState<Set<string>>(new Set());
  const [pendingReviews, setPendingReviews] = useState<Set<string>>(new Set());
  const [busyActions, setBusyActions] = useState<Set<string>>(new Set());

  const { toasts, addToast, removeToast, updateToast } = useToasts();

  // Escuchar cambios en tiempo real de Firestore
  useEffect(() => {
    const unsubscribe = onRecordingsChange((recs) => {
      setRecordings(recs);
      // Limpiar pending states cuando Firestore confirma el status
      setPendingTranscriptions(prev => {
        const newSet = new Set(prev);
        recs.forEach(r => {
          if (r.transcription.status === 'processing' || r.transcription.status === 'completed' || r.transcription.status === 'error') {
            newSet.delete(r.id);
          }
        });
        return newSet;
      });
      setPendingReviews(prev => {
        const newSet = new Set(prev);
        recs.forEach(r => {
          if (r.revision.status === 'completed' || r.revision.status === 'error') {
            newSet.delete(r.id);
          }
        });
        return newSet;
      });
    });
    return () => unsubscribe();
  }, []);

  // Mostrar errores del hook de grabación
  useEffect(() => {
    if (recorder.error) {
      addToast({ type: 'error', message: recorder.error });
    }
  }, [recorder.error, addToast]);

  // Fetch autenticado para Cloud Run
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  // Helper para marcar acciones en progreso y evitar doble clic
  const withBusy = async (key: string, fn: () => Promise<void>) => {
    if (busyActions.has(key)) return;
    setBusyActions(prev => new Set(prev).add(key));
    try {
      await fn();
    } finally {
      setBusyActions(prev => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }
  };

  const handleStartRecording = async () => {
    addToast({ type: 'info', message: 'Iniciando grabación...', detail: 'Permite el acceso al micrófono si el navegador lo solicita' });
    await recorder.startRecording();
  };

  const handleStopRecording = async () => {
    const toastId = addToast({ type: 'loading', message: 'Guardando grabación...', persistent: true });

    const blob = await recorder.stopRecording();
    if (!blob) {
      updateToast(toastId, { type: 'error', message: 'No se pudo obtener la grabación', persistent: false });
      return;
    }

    setIsUploading(true);

    try {
      const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
      const fileName = `mic_recording_${Date.now()}.${extension}`;

      updateToast(toastId, { message: 'Subiendo audio a la nube...', detail: '0%' });

      const { storagePath } = await uploadAudio(blob, fileName, (progress) => {
        setUploadProgress(progress);
        updateToast(toastId, { detail: `${Math.round(progress)}%` });
      });

      updateToast(toastId, { message: 'Registrando grabación...', detail: undefined });

      await createRecording({
        fileName,
        originalName: fileName,
        size: blob.size,
        mimeType: blob.type,
        storagePath,
      });

      updateToast(toastId, { type: 'success', message: 'Grabación guardada', persistent: false });
      setUploadProgress(0);
    } catch (err) {
      console.error('Error guardando grabación:', err);
      updateToast(toastId, { type: 'error', message: 'Error al guardar la grabación', persistent: false });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = addToast({ type: 'loading', message: `Subiendo ${file.name}...`, persistent: true });

    try {
      const { storagePath } = await uploadAudio(file, file.name, (progress) => {
        setUploadProgress(progress);
        updateToast(toastId, { detail: `${Math.round(progress)}%` });
      });

      await createRecording({
        fileName: `uploaded_${Date.now()}_${file.name}`,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        storagePath,
      });

      updateToast(toastId, { type: 'success', message: `${file.name} subido correctamente`, persistent: false });
      setUploadProgress(0);
    } catch (err) {
      console.error('Upload error:', err);
      updateToast(toastId, { type: 'error', message: 'Error al subir el archivo', persistent: false });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (recording: RecordingDoc) => {
    await withBusy(`delete-${recording.id}`, async () => {
      const toastId = addToast({ type: 'loading', message: 'Eliminando grabación...', persistent: true });
      try {
        await deleteFile(recording.storagePath).catch(() => {});
        if (recording.transcription.storagePath) {
          await deleteFile(recording.transcription.storagePath).catch(() => {});
        }
        if (recording.revision.storagePath) {
          await deleteFile(recording.revision.storagePath).catch(() => {});
        }
        await deleteRecordingDoc(recording.id);
        updateToast(toastId, { type: 'success', message: 'Grabación eliminada', persistent: false });
      } catch (err) {
        updateToast(toastId, { type: 'error', message: 'Error al eliminar', persistent: false });
      }
    });
  };

  const handleTranscribe = async (recording: RecordingDoc) => {
    await withBusy(`transcribe-${recording.id}`, async () => {
      // Estado local INMEDIATO — el usuario ve feedback al instante
      setPendingTranscriptions(prev => new Set(prev).add(recording.id));
      const toastId = addToast({
        type: 'loading',
        message: 'Conectando con el servicio de transcripción...',
        detail: 'Esto puede tardar unos segundos la primera vez',
        persistent: true,
      });

      // Timeout de 10 minutos para la solicitud HTTP (la transcripción es síncrona en Cloud Run)
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 600_000);

      try {
        const response = await authFetch(`${CLOUD_RUN_URL}/transcribe`, {
          method: 'POST',
          body: JSON.stringify({
            recordingId: recording.id,
            storagePath: recording.storagePath,
          }),
          signal: controller.signal,
        });

        clearTimeout(fetchTimeout);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error del servidor');
        }

        updateToast(toastId, {
          type: 'success',
          message: 'Transcripción completada',
          persistent: false,
        });
      } catch (err) {
        clearTimeout(fetchTimeout);
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        const message = isTimeout
          ? 'La transcripción tardó demasiado. Revisa el progreso recargando la página.'
          : err instanceof Error ? err.message : 'Error de conexión';
        setPendingTranscriptions(prev => {
          const s = new Set(prev);
          s.delete(recording.id);
          return s;
        });
        updateToast(toastId, {
          type: 'error',
          message: isTimeout ? 'Tiempo de espera agotado' : 'Error al iniciar transcripción',
          detail: message,
          persistent: false,
        });
      }
    });
  };

  const handleReview = async (recording: RecordingDoc) => {
    if (!recording.transcription.text) return;

    await withBusy(`review-${recording.id}`, async () => {
      setPendingReviews(prev => new Set(prev).add(recording.id));
      const toastId = addToast({
        type: 'loading',
        message: 'Enviando texto para revisión...',
        persistent: true,
      });

      try {
        const response = await authFetch(`${CLOUD_RUN_URL}/review`, {
          method: 'POST',
          body: JSON.stringify({
            recordingId: recording.id,
            text: recording.transcription.text,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error del servidor');
        }

        updateToast(toastId, {
          type: 'success',
          message: 'Texto revisado exitosamente',
          persistent: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de conexión';
        setPendingReviews(prev => {
          const s = new Set(prev);
          s.delete(recording.id);
          return s;
        });
        updateToast(toastId, {
          type: 'error',
          message: 'Error al revisar el texto',
          detail: message,
          persistent: false,
        });
      }
    });
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
        addToast({ type: 'error', message: 'Error al reproducir audio' });
      }
    }
  };

  const downloadAudio = async (recording: RecordingDoc) => {
    await withBusy(`download-${recording.id}`, async () => {
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
        addToast({ type: 'error', message: 'Error al descargar audio' });
      } finally {
        setDownloadingFile(null);
      }
    });
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
      addToast({ type: 'error', message: 'Error al descargar la transcripción' });
    } finally {
      setDownloadingFile(null);
    }
  };

  const toggleTranscription = (id: string) => {
    setExpandedTranscriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleRevisedText = (id: string) => {
    setShowRevisedText(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleCopy = (text: string) => {
    setCopiedText(text);
    addToast({ type: 'success', message: 'Texto copiado al portapapeles' });
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

  // Estado visual: combina Firestore + estado local para feedback inmediato
  const isTranscribing = (rec: RecordingDoc) =>
    rec.transcription.status === 'processing' || pendingTranscriptions.has(rec.id);
  const isReviewing = (rec: RecordingDoc) =>
    rec.revision.status === 'processing' || pendingReviews.has(rec.id);
  const hasTranscription = (rec: RecordingDoc) =>
    rec.transcription.status === 'completed' && rec.transcription.text;
  const hasRevision = (rec: RecordingDoc) =>
    rec.revision.status === 'completed' && rec.revision.text;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Audio Recorder con Transcripción</h1>
        <div className="user-bar">
          <span className="user-email">{user.email}</span>
          <a
            href="https://console.firebase.google.com/project/audio-recorder-mg/authentication/users"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-button"
            title="Administrar usuarios"
          >
            <Settings size={16} />
          </a>
          <button className="signout-button" onClick={onSignOut}>
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
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
            <div className="upload-progress-bar">
              <div className="upload-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              <span className="upload-progress-text">
                Subiendo... {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : ''}
              </span>
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
          <div className="progress-panel">
            <div className="progress-panel-header">
              <Loader size={16} className="spinning" />
              Procesando transcripción
            </div>

            {recordings.filter(r => isTranscribing(r)).map((rec) => (
              <div key={rec.id} className="progress-panel-item">
                <div className="progress-panel-filename">
                  {truncateFileName(rec.originalName || rec.fileName, 35)}
                </div>
                <div className="progress-panel-message">
                  {pendingTranscriptions.has(rec.id) && rec.transcription.status === 'pending'
                    ? 'Conectando con el servicio...'
                    : rec.transcription.progressMessage || 'Procesando...'}
                </div>
                {rec.transcription.progress > 0 && (
                  <div className="progress-panel-bar">
                    <div
                      className="progress-panel-bar-fill"
                      style={{ width: `${rec.transcription.progress}%` }}
                    />
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
                          <span>
                            {pendingTranscriptions.has(recording.id) && recording.transcription.status === 'pending'
                              ? 'Enviando...'
                              : 'Transcribiendo...'}
                          </span>
                        </div>
                      ) : recording.transcription.status === 'error' ? (
                        <button
                          className="action-button transcribe"
                          onClick={() => handleTranscribe(recording)}
                          disabled={busyActions.has(`transcribe-${recording.id}`)}
                          title="Reintentar transcripción"
                        >
                          <FileText size={20} />
                        </button>
                      ) : !hasTranscription(recording) ? (
                        <button
                          className="action-button transcribe"
                          onClick={() => handleTranscribe(recording)}
                          disabled={busyActions.has(`transcribe-${recording.id}`)}
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
                        disabled={busyActions.has(`download-${recording.id}`)}
                      >
                        <Download size={20} />
                      </button>

                      <button
                        className="action-button delete"
                        onClick={() => handleDelete(recording)}
                        disabled={busyActions.has(`delete-${recording.id}`)}
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Error de transcripción inline */}
                  {recording.transcription.status === 'error' && (
                    <div className="recording-error-banner">
                      <AlertCircle size={14} />
                      Error en transcripción: {recording.transcription.error}
                      <button
                        className="recording-error-retry"
                        onClick={() => handleTranscribe(recording)}
                        disabled={busyActions.has(`transcribe-${recording.id}`)}
                      >
                        Reintentar
                      </button>
                    </div>
                  )}

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

                          {!hasRevision(recording) && !isReviewing(recording) && (
                            <button
                              className="transcription-button"
                              onClick={() => handleReview(recording)}
                              disabled={busyActions.has(`review-${recording.id}`)}
                              title="Revisar y editar texto con IA"
                              style={{ backgroundColor: '#4CAF50' }}
                            >
                              <FileText size={16} />
                              Revisar y Editar Texto
                            </button>
                          )}

                          {isReviewing(recording) && (
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

      {/* Sistema de Toasts */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'loading' && <Loader size={18} className="spinning" />}
              {toast.type === 'success' && <CheckCircle size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
              {toast.detail && <div className="toast-detail">{toast.detail}</div>}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
