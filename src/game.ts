// Game lifecycle + persistence: which Puzzle is open, autosave, creation.

import { Texture } from 'pixi.js'
import * as board from './board'
import { ingestPhoto, putPuzzle, type IngestResult, type PuzzleRec } from './store'

let rec: PuzzleRec | null = null
let texture: Texture | null = null
let refURL: string | null = null

export function getRec() { return rec }

export async function startGame(r: PuzzleRec): Promise<void> {
  rec = r
  const bmp = await createImageBitmap(r.photo)
  texture?.destroy(true)
  texture = Texture.from(bmp)

  const ref = document.getElementById('ref') as HTMLImageElement
  if (refURL) URL.revokeObjectURL(refURL)
  refURL = URL.createObjectURL(r.photo)
  ref.src = refURL
  ref.style.display = (document.getElementById('ghost') as HTMLInputElement).checked ? 'block' : 'none'

  board.buildBoard({ w: r.w, h: r.h, cols: r.cols, rows: r.rows, seed: r.seed, tab: r.tab, jit: r.jit }, texture)
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
    best != null && best < e ? `${fmt(e)} · best ${fmt(best)}` : `${fmt(e)} · personal best!`
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

export async function createFromFile(file: File, o: CutOptions): Promise<void> {
  const ing = await ingestPhoto(file)
  await createAndOpen(file.name.replace(/\.\w+$/, '') || 'photo', ing, o)
}

export async function createDemo(o: CutOptions): Promise<void> {
  const blob = await (await fetch('/photo.jpg')).blob()
  const ing = await ingestPhoto(blob)
  await createAndOpen('kagemusha (demo)', ing, o)
}
