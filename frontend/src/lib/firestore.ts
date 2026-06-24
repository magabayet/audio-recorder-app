import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  type Unsubscribe,
  type UpdateData,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

export interface RecordingDoc {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  storagePath: string;
  createdAt: Timestamp;
  transcription: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    text: string | null;
    storagePath: string | null;
    progress: number;
    progressMessage: string;
    error: string | null;
    completedAt: Timestamp | null;
  };
  revision: {
    status: 'none' | 'processing' | 'completed' | 'error';
    text: string | null;
    storagePath: string | null;
    completedAt: Timestamp | null;
  };
}

const RECORDINGS_COLLECTION = 'recordings';

/**
 * Crea un nuevo documento de grabación en Firestore
 */
export async function createRecording(data: {
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  storagePath: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, RECORDINGS_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
    transcription: {
      status: 'pending',
      text: null,
      storagePath: null,
      progress: 0,
      progressMessage: '',
      error: null,
      completedAt: null,
    },
    revision: {
      status: 'none',
      text: null,
      storagePath: null,
      completedAt: null,
    },
  });
  return docRef.id;
}

/**
 * Escucha cambios en tiempo real de la lista de grabaciones
 */
export function onRecordingsChange(
  callback: (recordings: RecordingDoc[]) => void
): Unsubscribe {
  const q = query(
    collection(db, RECORDINGS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const recordings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RecordingDoc[];
    callback(recordings);
  });
}

/**
 * Elimina una grabación de Firestore
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  await deleteDoc(doc(db, RECORDINGS_COLLECTION, recordingId));
}

/**
 * Actualiza campos de transcripción en una grabación
 */
export async function updateTranscription(
  recordingId: string,
  data: Partial<RecordingDoc['transcription']>
): Promise<void> {
  const updates: UpdateData<DocumentData> = {};
  for (const [key, value] of Object.entries(data)) {
    (updates as Record<string, unknown>)[`transcription.${key}`] = value;
  }
  await updateDoc(doc(db, RECORDINGS_COLLECTION, recordingId), updates);
}

/**
 * Actualiza campos de revisión en una grabación
 */
export async function updateRevision(
  recordingId: string,
  data: Partial<RecordingDoc['revision']>
): Promise<void> {
  const updates: UpdateData<DocumentData> = {};
  for (const [key, value] of Object.entries(data)) {
    (updates as Record<string, unknown>)[`revision.${key}`] = value;
  }
  await updateDoc(doc(db, RECORDINGS_COLLECTION, recordingId), updates);
}
