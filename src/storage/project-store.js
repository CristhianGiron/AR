/** Project content stays in this origin's IndexedDB, including embedded GLB assets. */
export function createProjectStore() {
  let pending;
  function database() {
    if (!pending) pending = new Promise((resolve, reject) => {
      const request = indexedDB.open('explorar-projects', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'id' });
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); pending = null; }; resolve(db); };
      request.onerror = () => { pending = null; reject(request.error); };
      request.onblocked = () => { pending = null; reject(new Error('Cierra otras pestañas de ExplorAR e inténtalo de nuevo.')); };
    });
    return pending;
  }
  async function transaction(mode, action) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', mode), request = action(tx.objectStore('projects')); let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result); tx.onerror = tx.onabort = () => reject(tx.error || request.error || new Error('No se pudo guardar la escena.'));
    });
  }
  // Keep only summaries in the picker; never retain every embedded GLB at once.
  async function list() {
    const db = await database();
    return new Promise((resolve, reject) => {
      const rows = [], tx = db.transaction('projects', 'readonly');
      const request = tx.objectStore('projects').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const record = cursor.value;
        rows.push({ id: record.id, updatedAt: record.updatedAt, name: record.document.name, count: record.document.entries.length });
        cursor.continue();
      };
      tx.oncomplete = () => resolve(rows);
      tx.onerror = tx.onabort = () => reject(tx.error || request.error || new Error('No se pudieron leer las escenas.'));
    });
  }
  return {
    list,
    get: (id) => transaction('readonly', (store) => store.get(id)),
    put: (project) => transaction('readwrite', (store) => store.put(project)),
    remove: (id) => transaction('readwrite', (store) => store.delete(id)),
  };
}
