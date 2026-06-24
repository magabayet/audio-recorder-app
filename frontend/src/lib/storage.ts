import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * Sube un archivo de audio a Google Cloud Storage con progreso
 */
export function uploadAudio(
  file: Blob,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ storagePath: string; downloadURL: string }> {
  const storagePath = `recordings/${Date.now()}_${fileName}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ storagePath, downloadURL });
      }
    );
  });
}

/**
 * Obtiene la URL de descarga de un archivo en Storage
 */
export async function getFileURL(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}

/**
 * Elimina un archivo de Storage
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
