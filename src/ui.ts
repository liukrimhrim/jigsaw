// Bar controls, new-game preset dialog, library overlay, confetti.
// DOM only; talks to board/game/store/sound.

import * as board from './board'
import * as game from './game'
import { applyStatic, getLang, setLang, t, tf } from './i18n'
import * as sound from './sound'
import { deletePuzzle, ingestPhoto, listPuzzles, storageInfo, type IngestResult } from './store'

const $ = (id: string) => document.getElementById(id) as HTMLInputElement

// ---------- persisted toggles ----------
const pref = (k: string, def: boolean): boolean => {
  const v = localStorage.getItem('jig.' + k)
  return v == null ? def : v === '1'
}
const setPref = (k: string, v: boolean) => localStorage.setItem('jig.' + k, v ? '1' : '0')

// ---------- difficulty presets (SPEC tunables) ----------
const PRESETS = {
  easy: { n: 24, tab: 18, jit: 8 },
  medium: { n: 96, tab: 15, jit: 4 },
  hard: { n: 192, tab: 13, jit: 1 },
} as const
type PresetKey = keyof typeof PRESETS
const CHALLENGE_MULT = 2.5

const effectiveN = (k: PresetKey) =>
  $('challenge').checked ? Math.round(PRESETS[k].n * CHALLENGE_MULT) : PRESETS[k].n

function refreshPresetLabels() {
  for (const k of Object.keys(PRESETS) as PresetKey[])
    document.getElementById('cnt-' + k)!.textContent = `${effectiveN(k)} ${t('pieces')}`
}

// pending photo waiting for a difficulty choice
type Pending = { kind: 'new'; name: string; ing: IngestResult } | { kind: 'current' }
let pending: Pending | null = null

function openNewGame(p: Pending) {
  pending = p
  refreshPresetLabels()
  document.getElementById('newgame')!.style.display = 'grid'
}
function closeNewGame() {
  pending = null
  document.getElementById('newgame')!.style.display = 'none'
}
async function chooseCut(o: game.CutOptions) {
  const p = pending
  closeNewGame()
  if (!p) return
  if (p.kind === 'current') await game.newFromCurrent(o)
  else await game.createAndOpen(p.name, p.ing, o)
}

// ---------- init ----------
export function initUI(qs: URLSearchParams): void {
  applyStatic()
  const langBtn = document.getElementById('lang')!
  langBtn.textContent = getLang() === 'zh' ? 'EN' : '中'
  langBtn.onclick = () => setLang(getLang() === 'zh' ? 'en' : 'zh')

  // toggles: qs override → persisted pref → default
  const rot = qs.has('rot') ? qs.get('rot') !== '0' : pref('rot', true)
  $('rot').checked = rot
  board.setRot(rot)
  board.setTol(parseInt(qs.get('tol') ?? '18', 10))
  $('grid').checked = pref('grid', true)
  board.setGridVisible($('grid').checked)
  // reference mode: side thumbnail / ghost under the board / off (legacy bool migrates)
  const refmode = localStorage.getItem('jig.refmode') ??
    (localStorage.getItem('jig.ref') === '0' ? 'off' : 'side')
  ;($('refmode') as unknown as HTMLSelectElement).value = refmode
  applyRefMode()
  $('sound').checked = pref('sound', true)
  sound.setMuted(!$('sound').checked)
  $('challenge').checked = pref('challenge', false)

  $('rot').onchange = () => { board.setRot($('rot').checked); setPref('rot', $('rot').checked) }
  $('grid').onchange = () => { board.setGridVisible($('grid').checked); setPref('grid', $('grid').checked) }
  $('refmode').onchange = () => {
    localStorage.setItem('jig.refmode', $('refmode').value)
    applyRefMode()
  }

  applyBackground()
  $('bgmode').onchange = () => {
    const v = $('bgmode').value
    if (v === 'pick' || (v === 'custom' && !localStorage.getItem('jig.bgimg'))) {
      $('bgfile').click() // picker continues the flow; applyBackground resets on cancel
      return
    }
    localStorage.setItem('jig.bgmode', v)
    applyBackground()
    if (game.getRec()) location.reload() // canvas transparency + overlays are per-build
  }
  $('bgfile').onchange = async () => {
    const f = $('bgfile').files?.[0]
    $('bgfile').value = ''
    if (!f) { applyBackground(); return }
    try {
      const { url, onLight } = await game.makeBgImage(f)
      localStorage.setItem('jig.bgimg', url)
      localStorage.setItem('jig.bgLight', onLight ? '1' : '0')
      localStorage.setItem('jig.bgmode', 'custom')
      applyBackground()
      if (game.getRec()) location.reload()
    } catch {
      alert(t('heicFail'))
      applyBackground()
    }
  }
  $('sound').onchange = () => { sound.setMuted(!$('sound').checked); setPref('sound', $('sound').checked) }
  $('edges').onchange = () => board.setEdgesOnly($('edges').checked)
  $('challenge').onchange = () => { setPref('challenge', $('challenge').checked); refreshPresetLabels() }

  document.getElementById('scatter')!.onclick = () => board.scatter()
  document.getElementById('recut')!.onclick = () => { if (game.getRec()) openNewGame({ kind: 'current' }) }
  document.getElementById('games')!.onclick = () => { void showLib() }
  document.getElementById('libclose')!.onclick = hideLib
  document.getElementById('ngcancel')!.onclick = closeNewGame

  for (const k of Object.keys(PRESETS) as PresetKey[]) {
    document.getElementById('p-' + k)!.onclick = () =>
      { void chooseCut({ n: effectiveN(k), tab: PRESETS[k].tab, jit: PRESETS[k].jit }) }
  }
  $('n').oninput = () => { document.getElementById('nval')!.textContent = $('n').value }
  document.getElementById('customgo')!.onclick = () =>
    { void chooseCut({ n: parseInt($('n').value, 10), tab: parseInt($('tab').value, 10), jit: parseInt($('jit').value, 10) }) }

  $('file').onchange = async () => {
    const f = $('file').files?.[0]
    $('file').value = ''
    if (!f) return
    try {
      const ing = await ingestPhoto(f)
      hideLib()
      openNewGame({ kind: 'new', name: f.name.replace(/\.\w+$/, '') || 'photo', ing })
    } catch {
      alert(t('heicFail'))
    }
  }
  document.getElementById('demo')!.onclick = async () => {
    const ing = await ingestPhoto(await game.demoBlob())
    hideLib()
    openNewGame({ kind: 'new', name: t('demoName'), ing })
  }

  document.getElementById('fs')!.onclick = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  // reference loupe: hover the thumbnail → that region at full stored resolution
  const ref = document.getElementById('ref') as HTMLImageElement
  const loupe = document.getElementById('loupe') as HTMLElement
  const updateLoupe = (e: PointerEvent) => {
    const rec = game.getRec()
    if (!rec) return
    const r = ref.getBoundingClientRect()
    const L = Math.max(140, Math.min(280, r.left - 24)) // fit left of the thumb
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    loupe.style.width = `${L}px`
    loupe.style.height = `${L}px`
    loupe.style.left = `${r.left - L - 12}px`
    loupe.style.top = `${Math.min(r.top, innerHeight - L - 12)}px`
    loupe.style.backgroundImage = `url(${ref.src})`
    loupe.style.backgroundSize = `${rec.w}px ${rec.h}px`
    loupe.style.backgroundPosition = `${-(u * rec.w - L / 2)}px ${-(v * rec.h - L / 2)}px`
  }
  ref.onpointerenter = (e) => { loupe.style.display = 'block'; updateLoupe(e) }
  ref.onpointermove = updateLoupe
  ref.onpointerleave = () => { loupe.style.display = 'none' }

  // install hint: hide once dismissed or when already running installed
  const standalone = matchMedia('(display-mode: standalone)').matches
  const hint = document.getElementById('installhint') as HTMLElement
  hint.style.display = standalone || pref('hintdone', false) ? 'none' : 'block'
  document.getElementById('hintok')!.onclick = () => {
    setPref('hintdone', true)
    hint.style.display = 'none'
  }

  // quiet timer
  setInterval(() => {
    const t = game.tickSecond()
    document.getElementById('timer')!.textContent = t ?? ''
  }, 1000)
}

export function applyBackground(): void {
  const img = localStorage.getItem('jig.bgimg')
  const active = localStorage.getItem('jig.bgmode') === 'custom' && !!img
  document.getElementById('app')!.style.background =
    active ? `#141418 url(${img}) center / cover no-repeat` : ''
  ;($('bgmode') as unknown as HTMLSelectElement).value = active ? 'custom' : 'auto'
}

export function applyRefMode(): void {
  const mode = ($('refmode') as unknown as HTMLSelectElement).value
  ;(document.getElementById('ref') as HTMLElement).style.display =
    mode === 'side' && game.getRec() ? 'block' : 'none'
  board.setGhostVisible(mode === 'ghost')
}

export function updateStatus(): void {
  const rec = game.getRec()
  const c = board.counts()
  document.getElementById('status')!.textContent = rec
    ? `${rec.name} · ${c.cols}×${c.rows} = ${c.pieces} ${t('pieces')} · ${c.clusters} ${t('clusters')}`
    : t('noPuzzle')
  document.getElementById('timer')!.textContent = rec ? game.fmt(rec.elapsedMs ?? 0) : ''
}

// ---------- celebration ----------
export function confetti(): void {
  const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22']
  for (let i = 0; i < 28; i++) {
    const d = document.createElement('div')
    d.style.cssText = `position:fixed;z-index:20;width:10px;height:14px;pointer-events:none;` +
      `left:${Math.random() * 100}vw;top:-20px;background:${colors[i % colors.length]};`
    document.body.appendChild(d)
    d.animate(
      [
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        { transform: `translateY(${60 + Math.random() * 30}vh) rotate(${360 + Math.random() * 540}deg)`, opacity: 0 },
      ],
      { duration: 1600 + Math.random() * 900, easing: 'cubic-bezier(.2,.6,.4,1)' },
    ).onfinish = () => d.remove()
  }
}

// ---------- library ----------
const libEl = () => document.getElementById('lib')!
let cardURLs: string[] = []

export async function showLib(): Promise<void> {
  const cards = document.getElementById('cards')!
  for (const u of cardURLs) URL.revokeObjectURL(u)
  cardURLs = []
  cards.innerHTML = ''
  const all = (await listPuzzles()).sort((a, b) => b.updatedAt - a.updatedAt)
  for (const r of all) {
    const card = document.createElement('div')
    card.className = 'card'
    const img = document.createElement('img')
    const u = URL.createObjectURL(r.thumb)
    cardURLs.push(u)
    img.src = u
    const name = document.createElement('div')
    name.className = 'cname'
    name.textContent = r.name
    const meta = document.createElement('div')
    meta.className = 'cmeta'
    meta.textContent = `${r.cols * r.rows} ${t('pieces')} · ${r.solved ? `${t('solvedMark')} ${game.fmt(r.bestMs ?? r.elapsedMs ?? 0)}` : t('resume')}`
    const del = document.createElement('button')
    del.className = 'del'
    del.textContent = '✕'
    del.onclick = async (e) => {
      e.stopPropagation()
      await deletePuzzle(r.id!)
      if (game.getRec()?.id === r.id) { location.search = ''; return }
      void showLib()
    }
    card.onclick = () => { location.search = `g=${r.id}` }
    card.append(img, name, meta, del)
    cards.appendChild(card)
  }
  ;(document.getElementById('libempty') as HTMLElement).style.display = all.length ? 'none' : 'block'
  ;(document.getElementById('libclose') as HTMLElement).style.display = game.getRec() ? 'inline-block' : 'none'
  libEl().style.display = 'grid'

  const info = await storageInfo()
  document.getElementById('libstore')!.textContent =
    (info.usageMB != null ? tf('stored', { mb: info.usageMB }) : '') +
    (info.persistent === false ? ` · ${t('evict')}` : '')
}

export function hideLib(): void { libEl().style.display = 'none' }
