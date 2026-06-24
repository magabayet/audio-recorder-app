import { useState, useRef, useCallback } from 'react';

interface UseMediaRecorderReturn {
  isRecording: boolean;
  duration: number;
  stream: MediaStream | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

/**
 * Hook para grabar audio desde el navegador usando MediaRecorder API.
 * Reemplaza la captura de FFmpeg del backend para la versión web.
 */
export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      setStream(audioStream);

      // Elegir formato: WebM en Chrome/Firefox, MP4 en Safari
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';

      const recorder = new MediaRecorder(audioStream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        resolveStopRef.current?.(blob);
        resolveStopRef.current = null;
      };

      recorder.onerror = () => {
        setError('Error durante la grabación');
        resolveStopRef.current?.(null);
        resolveStopRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Chunk cada segundo

      startTimeRef.current = Date.now();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.'
          : 'No se pudo acceder al micrófono.';
      setError(message);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;

      // Detener el timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Detener el recorder (dispara onstop -> resolve)
      mediaRecorderRef.current.stop();

      // Detener las pistas del stream
      stream?.getTracks().forEach((track) => track.stop());

      setIsRecording(false);
      setDuration(0);
      setStream(null);
      mediaRecorderRef.current = null;
    });
  }, [stream]);

  return {
    isRecording,
    duration,
    stream,
    error,
    startRecording,
    stopRecording,
  };
}
