// PROTOTYPE — throwaway spike code, not production.
// Core spike + Library/save-resume: pick or add a photo (Puzzle), play it,
// progress autosaves to IndexedDB and restores by deterministic seed.

import { Application, Container, Graphics, Matrix, Polygon, Texture } from 'pixi.js'
import { generateCut, type PieceSpec } from './cut'
import { deletePuzzle, getPuzzle, ingestPhoto, listPuzzles, putPuzzle, type IngestResult, type PuzzleRec } from './store'

const qs = new URLSearchParams(location.search)
let ROT = qs.get('rot') !== '0' // rotated by default
let TOL = parseInt(qs.get('tol') ?? '18', 10)

const $ = (id: string) => document.getElementById(id) as HTMLInputElement
$('n').value = qs.get('n') ?? '24'
$('tab').value = qs.get('tab') ?? '15'
$('jit').value = qs.get('jit') ?? '4'
$('rot').checked = ROT
$('tol').value = String(TOL)

interface Piece {
  g: Graphics
  shadow: Graphics
  spec: PieceSpec
  cluster: Cluster
}
interface Cluster {
  pieces: Piece[]
  angle: number // 0/90/180/270 — all members share it
}

const app = new Application()
const appEl = document.getElementById('app')!
await app.init({ resizeTo: appEl, background: '#1b1b1f', antialias: true, resolution: devicePixelRatio, autoDensity: true })
appEl.appendChild(app.canvas)

const world = new Container()
app.stage.addChild(world)

// ---------- per-game state ----------
let rec: PuzzleRec | null = null
let texture: Texture | null = null
let refURL: string | null = null
let W = 1, H = 1, cols = 2, rows = 2, BEV = 2
let specs: PieceSpec[] = []
let pieces: Piece[] = []
let byCell = new Map<string, Piece>()
let clusters = new Set<Cluster>()
let BOUNDS = { x0: 0, x1: 1, y0: 0, y1: 1 }

// ---------- view fit + pan/zoom ----------
function fitView() {
  const margin = 0.75 // leave room around the board for scattered pieces
  const s = Math.min(app.screen.width / (W * (1 + margin)), app.screen.height / (H * (1 + margin)))
  world.scale.set(s)
  world.position.set(app.screen.width / 2 - (W / 2) * s, app.screen.height / 2 - (H / 2) * s)
}
window.addEventListener('resize', () => requestAnimationFrame(fitView)) // rAF: let resizeTo settle first

app.stage.eventMode = 'static'
// pan/pinch surface behind the world — a hitArea on the stage itself would
// short-circuit hit-testing and swallow the pieces' events
const bg = new Graphics().rect(-16000, -16000, 32000, 32000).fill(0x1b1b1f)
bg.eventMode = 'static'
app.stage.addChildAt(bg, 0)

interface Drag { cluster: Cluster; tapped: Piece; lastX: number; lastY: number; moved: number }
let drag: Drag | null = null
let pan: { lastX: number; lastY: number } | null = null
const pointers = new Map<number, { x: number; y: number }>()
let pinchBase: { d: number; s: number } | null = null

function startDrag(piece: Piece, gx: number, gy: number) {
  drag = { cluster: piece.cluster, tapped: piece, lastX: gx, lastY: gy, moved: 0 }
  for (const m of piece.cluster.pieces) world.addChild(m.g) // bring to front
}

bg.on('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.global.x, y: e.global.y })
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchBase = { d: Math.hypot(a.x - b.x, a.y - b.y), s: world.scale.x }
    drag = null
  } else if (!drag) {
    pan = { lastX: e.global.x, lastY: e.global.y }
  }
})
app.stage.on('pointermove', (e) => {
  const pt = pointers.get(e.pointerId)
  if (pt) { pt.x = e.global.x; pt.y = e.global.y }
  if (pinchBase && pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinchBase.s * d) / pinchBase.d)
    return
  }
  if (drag) {
    let dx = (e.global.x - drag.lastX) / world.scale.x
    let dy = (e.global.y - drag.lastY) / world.scale.y
    drag.moved += Math.abs(e.global.x - drag.lastX) + Math.abs(e.global.y - drag.lastY)
    drag.lastX = e.global.x; drag.lastY = e.global.y
    const t = drag.tapped.g // clamp via the held piece: the cluster stays reachable
    dx = Math.min(Math.max(dx, BOUNDS.x0 - t.x), BOUNDS.x1 - t.x)
    dy = Math.min(Math.max(dy, BOUNDS.y0 - t.y), BOUNDS.y1 - t.y)
    for (const m of drag.cluster.pieces) { m.g.x += dx; m.g.y += dy }
  } else if (pan) {
    world.x += e.global.x - pan.lastX
    world.y += e.global.y - pan.lastY
    pan.lastX = e.global.x; pan.lastY = e.global.y
  }
})
function endPointer(e: { pointerId: number }) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchBase = null
  if (drag) {
    if (ROT && drag.moved < 8) rotateCluster(drag.cluster, drag.tapped)
    else snapAround(drag.cluster)
    drag = null
    updateStatus()
    persistSoon()
  }
  pan = null
}
app.stage.on('pointerup', endPointer)
app.stage.on('pointerupoutside', endPointer)
app.stage.on('pointercancel', endPointer)

function zoomAt(gx: number, gy: number, scale: number) {
  const s = Math.min(4, Math.max(0.05, scale))
  const wx = (gx - world.x) / world.scale.x
  const wy = (gy - world.y) / world.scale.y
  world.scale.set(s)
  world.position.set(gx - wx * s, gy - wy * s)
}
window.addEventListener('wheel', (e) => zoomAt(e.clientX, e.clientY, world.scale.x * (e.deltaY < 0 ? 1.1 : 0.9)), { passive: true })

// ---------- rotation ----------
const R = (angle: number, x: number, y: number): [number, number] => {
  const a = (angle * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  return [x * c - y * s, x * s + y * c]
}

function rotateCluster(cluster: Cluster, around: Piece) {
  const cx = around.g.x, cy = around.g.y
  cluster.angle = (cluster.angle + 90) % 360
  for (const m of cluster.pieces) {
    const [nx, ny] = R(90, m.g.x - cx, m.g.y - cy)
    m.g.position.set(cx + nx, cy + ny)
    m.g.angle = cluster.angle
  }
  snapAround(cluster)
}

// ---------- snapping ----------
// 1) border pieces anchor to their absolute frame position when close + upright
// 2) neighbor-merge clusters, per-axis tolerance
function snapAround(cluster: Cluster) {
  let anchored = false
  if (cluster.angle === 0) {
    for (const p of cluster.pieces) {
      const sp = p.spec
      if (sp.row !== 0 && sp.col !== 0 && sp.row !== rows - 1 && sp.col !== cols - 1) continue
      const dx = sp.centroid.x - p.g.x, dy = sp.centroid.y - p.g.y
      if (Math.abs(dx) <= TOL && Math.abs(dy) <= TOL) {
        for (const m of cluster.pieces) { m.g.x += dx; m.g.y += dy }
        anchored = true
        break
      }
    }
  }
  let merged = true
  while (merged) {
    merged = false
    outer: for (const p of cluster.pieces) {
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const q = byCell.get(`${p.spec.row + dr},${p.spec.col + dc}`)
        if (!q || q.cluster === cluster) continue
        if (q.cluster.angle !== cluster.angle) continue
        const [ex, ey] = R(cluster.angle,
          q.spec.centroid.x - p.spec.centroid.x, q.spec.centroid.y - p.spec.centroid.y)
        const ax = q.g.x - p.g.x, ay = q.g.y - p.g.y
        if (Math.abs(ax - ex) <= TOL && Math.abs(ay - ey) <= TOL) {
          const fx = ax - ex, fy = ay - ey
          const other = q.cluster
          if (anchored) {
            // frame position wins: pull the other cluster onto us
            for (const m of other.pieces) { m.g.x -= fx; m.g.y -= fy }
          } else {
            for (const m of cluster.pieces) { m.g.x += fx; m.g.y += fy }
          }
          for (const m of other.pieces) { m.cluster = cluster; cluster.pieces.push(m) }
          clusters.delete(other)
          flash(cluster)
          merged = true
          break outer
        }
      }
    }
  }
  if (clusters.size === 1 && pieces.length > 0)
    (document.getElementById('solved') as HTMLElement).style.display = 'grid'
}

function flash(cluster: Cluster) {
  for (const m of cluster.pieces) m.g.tint = 0xaaffaa
  setTimeout(() => { for (const m of cluster.pieces) m.g.tint = 0xffffff }, 140)
}

// ---------- scatter: margin bands around the board, working space stays clear ----------
function scatter() {
  const cw = W / cols, ch = H / rows
  for (const c of clusters) {
    if (c.pieces.length > 1) continue // only unconnected pieces move (prior-art)
    const p = c.pieces[0]
    p.g.angle = c.angle = ROT ? 90 * Math.floor(Math.random() * 4) : 0
    const side = Math.floor(Math.random() * 4)
    let x: number, y: number
    if (side === 0) {        // left band
      x = -(cw * 0.8 + Math.random() * 0.28 * W); y = Math.random() * H
    } else if (side === 1) { // right band
      x = W + cw * 0.8 + Math.random() * 0.28 * W; y = Math.random() * H
    } else if (side === 2) { // top band
      x = Math.random() * W; y = -(ch * 0.8 + Math.random() * 0.22 * H)
    } else {                 // bottom band
      x = Math.random() * W; y = H + ch * 0.8 + Math.random() * 0.22 * H
    }
    p.g.position.set(x, y)
  }
  ;(document.getElementById('solved') as HTMLElement).style.display = 'none'
  updateStatus()
  persistSoon()
}

// ---------- persistence ----------
let saveT: number | undefined
function persist() {
  if (!rec) return
  rec.poses = pieces.map((p) => [
    Math.round(p.g.x * 100) / 100, Math.round(p.g.y * 100) / 100, p.g.angle,
  ])
  rec.solved = clusters.size === 1
  rec.updatedAt = Date.now()
  void putPuzzle(rec)
}
function persistSoon() {
  clearTimeout(saveT)
  saveT = window.setTimeout(persist, 400)
}
document.addEventListener('visibilitychange', () => { if (document.hidden) persist() })

/** after restoring exact poses, reunite clusters without moving anything */
function rebuildClusters() {
  for (const p of pieces) {
    for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
      const q = byCell.get(`${p.spec.row + dr},${p.spec.col + dc}`)
      if (!q || q.cluster === p.cluster || q.cluster.angle !== p.cluster.angle) continue
      const [ex, ey] = R(p.cluster.angle,
        q.spec.centroid.x - p.spec.centroid.x, q.spec.centroid.y - p.spec.centroid.y)
      if (Math.abs(q.g.x - p.g.x - ex) < 0.5 && Math.abs(q.g.y - p.g.y - ey) < 0.5) {
        const other = q.cluster
        for (const m of other.pieces) { m.cluster = p.cluster; p.cluster.pieces.push(m) }
        clusters.delete(other)
      }
    }
  }
  if (clusters.size === 1 && pieces.length > 0)
    (document.getElementById('solved') as HTMLElement).style.display = 'grid'
}

// ---------- game lifecycle ----------
async function startGame(r: PuzzleRec) {
  rec = r
  const bmp = await createImageBitmap(r.photo)
  texture?.destroy(true)
  texture = Texture.from(bmp)
  W = r.w; H = r.h; cols = r.cols; rows = r.rows
  BOUNDS = { x0: -0.45 * W, x1: 1.45 * W, y0: -0.45 * H, y1: 1.45 * H }
  if (refURL) URL.revokeObjectURL(refURL)
  refURL = URL.createObjectURL(r.photo)
  const ref = document.getElementById('ref') as HTMLImageElement
  ref.src = refURL
  ref.style.display = $('ghost').checked ? 'block' : 'none'

  for (const c of world.removeChildren()) c.destroy({ children: true })
  ;(document.getElementById('solved') as HTMLElement).style.display = 'none'

  const boardMark = new Graphics().rect(0, 0, W, H)
    .fill({ color: 0xffffff, alpha: 0.035 })
    .stroke({ width: 3, color: 0xffffff, alpha: 0.13 })
  world.addChild(boardMark)

  const grid = new Graphics()
  for (let xi = 1; xi < cols; xi++) grid.moveTo(xi * (W / cols), 0).lineTo(xi * (W / cols), H)
  for (let yi = 1; yi < rows; yi++) grid.moveTo(0, yi * (H / rows)).lineTo(W, yi * (H / rows))
  grid.stroke({ width: 2, color: 0xffffff, alpha: 0.05 })
  grid.visible = $('grid').checked
  world.addChild(grid)
  gridRef = grid

  const shadowLayer = new Container()
  world.addChild(shadowLayer)

  specs = generateCut(W, H, cols, rows, r.seed, r.tab / 200, r.jit / 100)
  pieces = []
  byCell = new Map()
  clusters = new Set()
  BEV = Math.max(1.5, Math.min(W / cols, H / rows) * 0.03)

  for (const spec of specs) {
    const emit = (gg: Graphics, dx: number, dy: number) => {
      gg.moveTo(spec.segs[0][0].x + dx, spec.segs[0][0].y + dy)
      for (const [, c1, c2, p1] of spec.segs)
        gg.bezierCurveTo(c1.x + dx, c1.y + dy, c2.x + dx, c2.y + dy, p1.x + dx, p1.y + dy)
      gg.closePath()
    }
    const g = new Graphics()
    emit(g, 0, 0)
    g.fill({ texture, matrix: new Matrix(), textureSpace: 'global' }) // path coords == photo pixel coords
    g.stroke({ width: 2, color: 0x0a0806, alpha: 0.55 }) // seam: dark cut line
    emit(g, BEV * 0.6, BEV * 0.6)
    g.stroke({ width: BEV * 0.8, color: 0x000000, alpha: 0.16 }) // inner shade, lower-right
    emit(g, -BEV * 0.6, -BEV * 0.6)
    g.stroke({ width: BEV * 0.8, color: 0xffffff, alpha: 0.11 }) // catch light, upper-left
    g.pivot.set(spec.centroid.x, spec.centroid.y)
    g.position.set(spec.centroid.x, spec.centroid.y)
    g.hitArea = new Polygon(spec.poly.flatMap((q) => [q.x, q.y]))
    g.eventMode = 'static'
    g.cursor = 'pointer'
    world.addChild(g)
    const shadow = new Graphics()
    emit(shadow, 0, 0)
    shadow.fill({ color: 0x000000, alpha: 0.4 })
    shadow.pivot.set(spec.centroid.x, spec.centroid.y)
    shadowLayer.addChild(shadow)
    const cluster: Cluster = { pieces: [], angle: 0 }
    const piece: Piece = { g, shadow, spec, cluster }
    cluster.pieces.push(piece)
    clusters.add(cluster)
    byCell.set(`${spec.row},${spec.col}`, piece)
    pieces.push(piece)
    g.on('pointerdown', (e) => {
      e.stopPropagation()
      startDrag(piece, e.global.x, e.global.y)
    })
  }

  if (r.poses.length === specs.length) {
    pieces.forEach((p, i) => {
      const [x, y, a] = r.poses[i]
      p.g.position.set(x, y)
      p.g.angle = a
      p.cluster.angle = a
    })
    rebuildClusters()
  } else {
    scatter()
  }
  fitView()
  updateStatus()
  hideLib()
}

let gridRef: Graphics | null = null

// ---------- library ----------
const libEl = document.getElementById('lib')!
let cardURLs: string[] = []
async function showLib() {
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
      if (rec?.id === r.id) { location.search = ''; return }
      void showLib()
    }
    card.onclick = () => { location.search = `g=${r.id}` }
    card.append(img, name, meta, del)
    cards.appendChild(card)
  }
  ;(document.getElementById('libempty') as HTMLElement).style.display = all.length ? 'none' : 'block'
  ;(document.getElementById('libclose') as HTMLElement).style.display = rec ? 'inline-block' : 'none'
  libEl.style.display = 'grid'
}
function hideLib() { libEl.style.display = 'none' }

function makeRec(name: string, ing: IngestResult): PuzzleRec {
  const N = parseInt($('n').value, 10)
  const aspect = ing.w / ing.h
  const c = Math.max(2, Math.round(Math.sqrt(N * aspect)))
  const now = Date.now()
  return {
    name,
    photo: ing.photo, thumb: ing.thumb, w: ing.w, h: ing.h,
    seed: Math.floor(Math.random() * 1e9),
    cols: c, rows: Math.max(2, Math.round(N / c)),
    tab: parseInt($('tab').value, 10), jit: parseInt($('jit').value, 10),
    poses: [], solved: false, createdAt: now, updatedAt: now,
  }
}
async function createAndOpen(name: string, ing: IngestResult) {
  const r = makeRec(name, ing)
  r.id = await putPuzzle(r)
  location.search = `g=${r.id}`
}
async function newFromCurrent() {
  if (!rec) return
  await createAndOpen(rec.name, { photo: rec.photo, thumb: rec.thumb, w: rec.w, h: rec.h })
}

// ---------- controls ----------
$('n').onchange = () => { void newFromCurrent() }
$('tab').onchange = () => { void newFromCurrent() }
$('jit').onchange = () => { void newFromCurrent() }
document.getElementById('recut')!.onclick = () => { void newFromCurrent() }
$('rot').onchange = () => { ROT = $('rot').checked }
$('tol').oninput = () => { TOL = parseInt($('tol').value, 10) }
$('ghost').onchange = () => {
  (document.getElementById('ref') as HTMLElement).style.display = $('ghost').checked ? 'block' : 'none'
}
$('grid').onchange = () => { if (gridRef) gridRef.visible = $('grid').checked }
document.getElementById('scatter')!.onclick = scatter
document.getElementById('games')!.onclick = () => { void showLib() }
document.getElementById('libclose')!.onclick = hideLib
$('file').onchange = async () => {
  const f = $('file').files?.[0]
  if (!f) return
  try {
    const ing = await ingestPhoto(f)
    await createAndOpen(f.name.replace(/\.\w+$/, '') || 'photo', ing)
  } catch {
    alert('could not read that image (HEIC outside Safari needs the planned wasm fallback)')
  }
}
document.getElementById('demo')!.onclick = async () => {
  const blob = await (await fetch('/photo.jpg')).blob()
  const ing = await ingestPhoto(blob)
  await createAndOpen('kagemusha (demo)', ing)
}

function updateStatus() {
  document.getElementById('status')!.textContent = rec
    ? `${rec.name} · ${cols}×${rows} = ${specs.length} pieces · ${clusters.size} clusters · seed ${rec.seed} · tab ${rec.tab} · vary ${rec.jit}`
    : 'no puzzle open — pick one from games'
}

// shadows track their pieces (offset in board px ≈ 2-3 screen px)
app.ticker.add(() => {
  for (const p of pieces) {
    p.shadow.position.set(p.g.x + 9, p.g.y + 12)
    p.shadow.rotation = p.g.rotation
  }
})

// ---------- boot ----------
const gid = qs.get('g')
if (gid) {
  const r = await getPuzzle(parseInt(gid, 10))
  if (r) await startGame(r)
  else await showLib()
} else {
  await showLib()
}
updateStatus()

// debug handle for driving the spike from the console (prototype only)
;(window as unknown as Record<string, unknown>).__spike = {
  get pieces() { return pieces }, get clusters() { return clusters }, get byCell() { return byCell },
  get W() { return W }, get H() { return H }, get rec() { return rec },
  snapAround, rotateCluster, startGame, app, world, bg,
}
