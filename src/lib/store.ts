/**
 * Optional copy of the export zip in this browser's IndexedDB, only when the
 * person ticks "keep on this device". It never leaves the device, and
 * "Oublier cet export" deletes it. Every call fails quietly (private mode,
 * blocked storage): the site then simply asks for the zip again.
 */

const DB = 'retro-twitch';
const STORE = 'files';
const KEY = 'export';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveExport(file: Blob): Promise<void> {
  try {
    await tx('readwrite', (s) => s.put(file, KEY));
  } catch {
    /* storage unavailable */
  }
}

export async function readExport(): Promise<Blob | null> {
  try {
    return ((await tx('readonly', (s) => s.get(KEY))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function clearExport(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(KEY));
  } catch {
    /* nothing to clear */
  }
}
