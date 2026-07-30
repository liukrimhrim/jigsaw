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
  elapsedMs?: number // accrued play time (M2 wires the clock)
  bestMs?: number    // personal best for this Puzzle
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

// Safari reads of IndexedDB-stored Blobs are unreliable (InvalidStateError:
// "error reading the Blob"). Store ArrayBuffers; rehydrate Blobs at the
// boundary. Old Blob-based records still rehydrate and self-migrate on the
// next save.
type StoredRec = Omit<PuzzleRec, 'photo' | 'thumb'> & {
  photo: ArrayBuffer | Blob
  thumb: ArrayBuffer | Blob
}
const asBlob = (v: ArrayBuffer | Blob): Blob =>
  v instanceof Blob ? v : new Blob([v], { type: 'image/jpeg' })
const rehydrate = (r: StoredRec | undefined): PuzzleRec | undefined =>
  r && { ...r, photo: asBlob(r.photo), thumb: asBlob(r.thumb) }

export async function putPuzzle(p: PuzzleRec): Promise<number> {
  const stored: StoredRec = {
    ...p,
    photo: await p.photo.arrayBuffer(),
    thumb: await p.thumb.arrayBuffer(),
  }
  return (await wrap((await store('readwrite')).put(stored))) as number
}
export async function getPuzzle(id: number): Promise<PuzzleRec | undefined> {
  return rehydrate((await wrap((await store('readonly')).get(id))) as StoredRec | undefined)
}
export async function listPuzzles(): Promise<PuzzleRec[]> {
  const all = (await wrap((await store('readonly')).getAll())) as StoredRec[]
  return all.map((r) => rehydrate(r)!)
}
export async function deletePuzzle(id: number): Promise<void> {
  await wrap((await store('readwrite')).delete(id))
}

/** storage pressure info for the Library: usage + whether the origin is persistent */
export async function storageInfo(): Promise<{ usageMB: number | null; persistent: boolean | null }> {
  const est = await navigator.storage?.estimate?.().catch(() => null)
  const persistent = (await navigator.storage?.persisted?.().catch(() => null)) ?? null
  return {
    usageMB: est?.usage != null ? Math.round(est.usage / 1048576 * 10) / 10 : null,
    persistent,
  }
}

export interface IngestResult { photo: Blob; thumb: Blob; w: number; h: number }

/** HEIC fallback for non-Safari browsers: lazy wasm decode → ImageBitmap */
async function decodeHeic(blob: Blob): Promise<ImageBitmap> {
  const { default: decode } = await import('heic-decode')
  const { width, height, data } = await decode({ buffer: new Uint8Array(await blob.arrayBuffer()) })
  return createImageBitmap(new ImageData(new Uint8ClampedArray(data), width, height))
}

/** most-compatible decoder: object URL + <img>.decode() (Safari-safe) */
export async function imgDecode(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** any photo blob → drawable, surviving Safari's createImageBitmap(Blob) quirks */
export async function decodePhoto(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    return imgDecode(blob).catch(() => decodeHeic(blob))
  }
}

/** file/blob → EXIF-corrected, ≤2048 long edge JPEG + 256px thumb */
export async function ingestPhoto(blob: Blob): Promise<IngestResult> {
  const bmp = await decodePhoto(blob)
  const bw = bmp instanceof HTMLImageElement ? bmp.naturalWidth : bmp.width
  const bh = bmp instanceof HTMLImageElement ? bmp.naturalHeight : bmp.height
  const scale = Math.min(1, 2048 / Math.max(bw, bh))
  const enc = (s: number) => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(bw * s))
    c.height = Math.max(1, Math.round(bh * s))
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return new Promise<Blob>((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.85))
  }
  const photo = await enc(scale)
  const thumb = await enc(Math.min(scale, 256 / Math.max(bw, bh)))
  const w = Math.max(1, Math.round(bw * scale))
  const h = Math.max(1, Math.round(bh * scale))
  if (bmp instanceof ImageBitmap) bmp.close()
  return { photo, thumb, w, h }
}
