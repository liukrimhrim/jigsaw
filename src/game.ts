// Game lifecycle + persistence: which Puzzle is open, autosave, creation.

import { Texture } from 'pixi.js'
import * as board from './board'
import { t, tf } from './i18n'
import { decodePhoto, putPuzzle, type IngestResult, type PuzzleRec } from './store'

let rec: PuzzleRec | null = null
let texture: Texture | null = null
let refURL: string | null = null

export function getRec() { return rec }

function meanRGB(bmp: ImageBitmap | HTMLImageElement): { r: number; g: number; b: number; lum: number } {
  const c = document.createElement('canvas')
  c.width = c.height = 16
  const x = c.getContext('2d')!
  x.drawImage(bmp, 0, 0, 16, 16)
  const d = x.getImageData(0, 0, 16, 16).data
  let r = 0, g = 0, b = 0
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
  const n = d.length / 4
  r /= n * 255; g /= n * 255; b /= n * 255
  return { r, g, b, lum: 0.2126 * r + 0.7152 * g + 0.0722 * b }
}

/** mean color of the photo → muted backdrop with opposite lightness (contrast) */
function paletteBackdrop(bmp: ImageBitmap | HTMLImageElement): { bgColor: number; onLight: boolean } {
  const { r, g, b, lum } = meanRGB(bmp)
  // hue of the mean color (harmonious), saturation muted, lightness flipped
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn
  let h = 0
  if (dl > 0.001) {
    if (mx === r) h = ((g - b) / dl + 6) % 6
    else if (mx === g) h = (b - r) / dl + 2
    else h = (r - g) / dl + 4
    h *= 60
  }
  const s = mx === 0 ? 0 : dl / mx
  const onLight = lum < 0.5
  const L = onLight ? 0.68 : 0.12
  const S = Math.min(0.22, s * 0.5 + 0.06)
  // hsl → rgb
  const a = S * Math.min(L, 1 - L)
  const f = (k0: number) => {
    const k = (k0 + h / 30) % 12
    return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  const to255 = (v: number) => Math.round(v * 255)
  return { bgColor: (to255(f(0)) << 16) | (to255(f(8)) << 8) | to255(f(4)), onLight }
}

/** custom backdrop image → downscaled data-URL + whether it's light (for overlays) */
export async function makeBgImage(blob: Blob): Promise<{ url: string; onLight: boolean }> {
  const bmp = await decodePhoto(blob)
  const bw = bmp instanceof HTMLImageElement ? bmp.naturalWidth : bmp.width
  const bh = bmp instanceof HTMLImageElement ? bmp.naturalHeight : bmp.height
  const s = Math.min(1, 1600 / Math.max(bw, bh))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bw * s))
  c.height = Math.max(1, Math.round(bh * s))
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/jpeg', 0.8)
  const onLight = meanRGB(bmp).lum >= 0.5 // the image IS the backdrop here
  if (bmp instanceof ImageBitmap) bmp.close()
  return { url, onLight }
}

export async function startGame(r: PuzzleRec): Promise<void> {
  rec = r
  const bmp = await decodePhoto(r.photo) // Safari-safe decode chain
  texture?.destroy(true)
  texture = Texture.from(bmp)
  const customBg = localStorage.getItem('jig.bgmode') === 'custom' && !!localStorage.getItem('jig.bgimg')
  board.setTransparent(customBg)
  const backdrop = customBg
    ? { bgColor: 0x1b1b1f, onLight: localStorage.getItem('jig.bgLight') === '1' }
    : paletteBackdrop(bmp)

  const ref = document.getElementById('ref') as HTMLImageElement
  if (refURL) URL.revokeObjectURL(refURL)
  refURL = URL.createObjectURL(r.photo)
  ref.src = refURL // visibility is ui.applyRefMode's job (side/ghost/off)

  board.buildBoard({ w: r.w, h: r.h, cols: r.cols, rows: r.rows, seed: r.seed, tab: r.tab, jit: r.jit, ...backdrop }, texture)
  if (!board.applyPoses(r.poses)) board.scatter()
  board.fitView()
  if (board.isSolved()) updateSolvedText() // restored solved save: banner text, no fanfare
}

// ---------- timer ----------
export const fmt = (ms: number): string => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

let ticks = 0
/** called once per second by the UI; accrues play time and returns the display string */
export function tickSecond(): string | null {
  if (!rec) return null
  if (!document.hidden && !board.isSolved()) {
    rec.elapsedMs = (rec.elapsedMs ?? 0) + 1000
    if (++ticks % 15 === 0) persistSoon() // timer-only progress still saves
  }
  return fmt(rec.elapsedMs ?? 0)
}

function updateSolvedText() {
  if (!rec) return
  const e = rec.elapsedMs ?? 0
  const best = rec.bestMs
  document.getElementById('solvedtime')!.textContent =
    best != null && best < e ? `${fmt(e)}${tf('bestSuffix', { t: fmt(best) })}` : `${fmt(e)}${t('personalBest')}`
}

/** interactive solve: finalize time, best, banner text; caller adds sound/confetti */
export function handleSolved() {
  if (!rec) return
  const e = rec.elapsedMs ?? 0
  rec.bestMs = rec.bestMs == null ? e : Math.min(rec.bestMs, e)
  updateSolvedText()
  persist()
}

// ---------- persistence ----------
let saveT: number | undefined
export function persist() {
  if (!rec) return
  rec.poses = board.getPoses()
  rec.solved = board.isSolved()
  rec.updatedAt = Date.now()
  void putPuzzle(rec)
}
export function persistSoon() {
  clearTimeout(saveT)
  saveT = window.setTimeout(persist, 400)
}
document.addEventListener('visibilitychange', () => { if (document.hidden) persist() })

// ---------- creation ----------
export interface CutOptions { n: number; tab: number; jit: number }

function makeRec(name: string, ing: IngestResult, o: CutOptions): PuzzleRec {
  const aspect = ing.w / ing.h
  const c = Math.max(2, Math.round(Math.sqrt(o.n * aspect)))
  const now = Date.now()
  return {
    name,
    photo: ing.photo, thumb: ing.thumb, w: ing.w, h: ing.h,
    seed: Math.floor(Math.random() * 1e9),
    cols: c, rows: Math.max(2, Math.round(o.n / c)),
    tab: o.tab, jit: o.jit,
    poses: [], solved: false, createdAt: now, updatedAt: now,
  }
}

export async function createAndOpen(name: string, ing: IngestResult, o: CutOptions): Promise<void> {
  const r = makeRec(name, ing, o)
  r.id = await putPuzzle(r)
  location.search = `g=${r.id}`
}

/** new Puzzle from the currently open photo (re-cut; never mutates the save) */
export async function newFromCurrent(o: CutOptions): Promise<void> {
  if (!rec) return
  await createAndOpen(rec.name, { photo: rec.photo, thumb: rec.thumb, w: rec.w, h: rec.h }, o)
}

/** procedurally drawn demo image — no bundled photo, works offline */
export function demoBlob(): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 1536
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, c.height)
  g.addColorStop(0, '#26355d'); g.addColorStop(0.5, '#a34a6b'); g.addColorStop(1, '#f2a65a')
  x.fillStyle = g
  x.fillRect(0, 0, c.width, c.height)
  x.fillStyle = '#ffd98a'
  x.beginPath(); x.arc(700, 430, 130, 0, 7); x.fill()
  for (let i = 0; i < 170; i++) { // local texture so every piece is distinguishable
    x.fillStyle = `hsla(${Math.random() * 360}, 70%, 65%, ${0.12 + Math.random() * 0.25})`
    x.beginPath()
    x.arc(Math.random() * 1024, Math.random() * 1536, 12 + Math.random() * 60, 0, 7)
    x.fill()
  }
  x.fillStyle = 'rgba(20,16,28,.55)'
  x.beginPath(); x.moveTo(0, 1250); x.quadraticCurveTo(300, 1100, 600, 1240)
  x.quadraticCurveTo(830, 1340, 1024, 1220); x.lineTo(1024, 1536); x.lineTo(0, 1536); x.fill()
  x.fillStyle = 'rgba(12,10,20,.75)'
  x.beginPath(); x.moveTo(0, 1400); x.quadraticCurveTo(400, 1280, 1024, 1420)
  x.lineTo(1024, 1536); x.lineTo(0, 1536); x.fill()
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('demo encode failed'))), 'image/jpeg', 0.9))
}
