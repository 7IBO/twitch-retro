/**
 * Copy of the export zip in this browser's IndexedDB, kept for 30 days at
 * most when "keep the export in this browser" is ticked (the default). It
 * never leaves the device, and "Change export" deletes it. Every call fails
 * quietly (private mode, blocked storage): the site then asks for the zip
 * again.
 */

const DB = 'retro-twitch';
const STORE = 'files';
const KEY = 'export';
/** The copy is deleted on the next visit after this many days. */
export const KEEP_DAYS = 30;

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

export async function saveExport(file: Blob): Promise<number | null> {
  try {
    const savedAt = Date.now();
    await tx('readwrite', (s) => s.put({ blob: file, savedAt }, KEY));
    return savedAt;
  } catch {
    return null; /* storage unavailable */
  }
}

export async function readExport(): Promise<{ blob: Blob; savedAt: number } | null> {
  try {
    const v = (await tx('readonly', (s) => s.get(KEY))) as { blob: Blob; savedAt: number } | undefined;
    if (!v?.blob) return null;
    if (Date.now() - v.savedAt > KEEP_DAYS * 86400000) {
      await clearExport();
      return null;
    }
    return v;
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
