// Bar controls + library overlay. DOM only; talks to board/game/store.

import * as board from './board'
import * as game from './game'
import { deletePuzzle, listPuzzles } from './store'

const $ = (id: string) => document.getElementById(id) as HTMLInputElement

const cutOptions = () => ({
  n: parseInt($('n').value, 10),
  tab: parseInt($('tab').value, 10),
  jit: parseInt($('jit').value, 10),
})

export function initUI(qs: URLSearchParams): void {
  $('n').value = qs.get('n') ?? '24'
  $('tab').value = qs.get('tab') ?? '15'
  $('jit').value = qs.get('jit') ?? '4'
  const rot = qs.get('rot') !== '0' // rotated by default
  $('rot').checked = rot
  board.setRot(rot)
  const tol = parseInt(qs.get('tol') ?? '18', 10)
  $('tol').value = String(tol)
  board.setTol(tol)

  $('n').onchange = () => { void game.newFromCurrent(cutOptions()) }
  $('tab').onchange = () => { void game.newFromCurrent(cutOptions()) }
  $('jit').onchange = () => { void game.newFromCurrent(cutOptions()) }
  document.getElementById('recut')!.onclick = () => { void game.newFromCurrent(cutOptions()) }
  $('rot').onchange = () => board.setRot($('rot').checked)
  $('tol').oninput = () => board.setTol(parseInt($('tol').value, 10))
  $('ghost').onchange = () => {
    (document.getElementById('ref') as HTMLElement).style.display =
      $('ghost').checked && game.getRec() ? 'block' : 'none'
  }
  $('grid').onchange = () => board.setGridVisible($('grid').checked)
  document.getElementById('scatter')!.onclick = () => board.scatter()
  document.getElementById('games')!.onclick = () => { void showLib() }
  document.getElementById('libclose')!.onclick = hideLib
  $('file').onchange = async () => {
    const f = $('file').files?.[0]
    if (!f) return
    try {
      await game.createFromFile(f, cutOptions())
    } catch {
      alert('could not read that image (HEIC outside Safari needs the planned wasm fallback)')
    }
  }
  document.getElementById('demo')!.onclick = () => { void game.createDemo(cutOptions()) }
}

export function updateStatus(): void {
  const rec = game.getRec()
  const c = board.counts()
  document.getElementById('status')!.textContent = rec
    ? `${rec.name} · ${c.cols}×${c.rows} = ${c.pieces} pieces · ${c.clusters} clusters · seed ${rec.seed} · tab ${rec.tab} · vary ${rec.jit}`
    : 'no puzzle open — pick one from games'
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
    meta.textContent = `${r.cols * r.rows} pieces · ${r.solved ? 'solved ✓' : 'resume'}`
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
}

export function hideLib(): void { libEl().style.display = 'none' }
