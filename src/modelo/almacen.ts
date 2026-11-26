// Guarda el modelo propio (ya optimizado) en IndexedDB para que sobreviva a recargar la página.
// localStorage no alcanza: tiene un límite de ~5 MB.

const DB = 'umbral'
const TABLA = 'archivos'
const CLAVE = 'modelo-propio'

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(TABLA)
    r.onsuccess = () => ok(r.result)
    r.onerror = () => mal(r.error)
  })
}

async function operar<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((ok, mal) => {
    const tx = db.transaction(TABLA, modo)
    const r = f(tx.objectStore(TABLA))
    r.onsuccess = () => ok(r.result)
    r.onerror = () => mal(r.error)
    tx.oncomplete = () => db.close()
  })
}

export const guardarModelo = (glb: Uint8Array) =>
  operar('readwrite', (s) => s.put(new Blob([glb as BlobPart], { type: 'model/gltf-binary' }), CLAVE))

export const leerModelo = () => operar<Blob | undefined>('readonly', (s) => s.get(CLAVE))

export const borrarModelo = () => operar('readwrite', (s) => s.delete(CLAVE))
