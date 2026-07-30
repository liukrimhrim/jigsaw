// PROTOTYPE — throwaway spike code, not production.
// Persistence per the photo-ingestion research: IndexedDB, one 'puzzles' store;
// photos stored as downscaled JPEG re-encodes (≤2048 long edge) + 256px thumbs;
// progress = poses array (deterministic seed regenerates the Cut).

export interface PuzzleRec {
  id?: number
  name: string
  photo: Blob
  thumb: Blob
  w: number
  h: number
  seed: number
  cols: number
  rows: number
  tab: number
  jit: number
  poses: [number, number, number][] // per piece, row-major: x, y, angle
  solved: boolean
  createdAt: number
  updatedAt: number
}

let dbP: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  if (!dbP) {
    dbP = new Promise((res, rej) => {
      const req = indexedDB.open('jigsaw', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('puzzles', { keyPath: 'id', autoIncrement: true })
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    void navigator.storage?.persist?.() // ask once; Safari ITP wipes unpersisted origins
  }
  return dbP
}
const store = async (mode: IDBTransactionMode) => (await db()).transaction('puzzles', mode).objectStore('puzzles')
const wrap = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => {
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})

export async function putPuzzle(p: PuzzleRec): Promise<number> {
  return (await wrap((await store('readwrite')).put(p))) as number
}
export async function getPuzzle(id: number): Promise<PuzzleRec | undefined> {
  return (await wrap((await store('readonly')).get(id))) as PuzzleRec | undefined
}
export async function listPuzzles(): Promise<PuzzleRec[]> {
  return (await wrap((await store('readonly')).getAll())) as PuzzleRec[]
}
export async function deletePuzzle(id: number): Promise<void> {
  await wrap((await store('readwrite')).delete(id))
}

export interface IngestResult { photo: Blob; thumb: Blob; w: number; h: number }

/** file/blob → EXIF-corrected, ≤2048 long edge JPEG + 256px thumb */
export async function ingestPhoto(blob: Blob): Promise<IngestResult> {
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height))
  const enc = (s: number) => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(bmp.width * s))
    c.height = Math.max(1, Math.round(bmp.height * s))
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return new Promise<Blob>((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.85))
  }
  const photo = await enc(scale)
  const thumb = await enc(Math.min(scale, 256 / Math.max(bmp.width, bmp.height)))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  bmp.close()
  return { photo, thumb, w, h }
}
