// Fotos guardadas en el móvil (IndexedDB: localStorage se queda corto para imágenes).
import { uid } from './core.js';

const DB = 'pueblos-sevilla-fotos';
let dbPromise = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('fotos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('fotos', mode);
    const req = fn(t.objectStore('fotos'));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const getPhoto = (id) => tx('readonly', (s) => s.get(id));
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));

// Reduce la foto (lado mayor 1280 px, JPEG) para que ocupe poco y se suba rápido.
export async function addPhoto(file, maxSide = 1280) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  let blob = file;
  if (bitmap) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
  }
  const id = uid();
  await tx('readwrite', (s) => s.put(blob, id));
  return 'idb:' + id;
}

// URL que se puede poner en <img> para una foto ("idb:…" o https).
const urls = new Map();
export async function photoUrl(ref) {
  if (!ref.startsWith('idb:')) return ref;
  if (urls.has(ref)) return urls.get(ref);
  const blob = await getPhoto(ref.slice(4)).catch(() => null);
  const url = blob ? URL.createObjectURL(blob) : '';
  urls.set(ref, url);
  return url;
}
