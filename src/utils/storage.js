const DB_NAME = 'md-editor-db';
const STORE_NAME = 'handles';

// Cache the DB connection so we don't open a new one on every call
let dbPromise = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => {
        dbPromise = null; // allow retry on next call
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        event.target.result.createObjectStore(STORE_NAME);
      };
    });
  }
  return dbPromise;
};

export const saveDirectoryHandle = async (handle) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, 'root-dir');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getDirectoryHandle = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('root-dir');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
