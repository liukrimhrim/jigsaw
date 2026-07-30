// Pixi board + interaction: pieces, drag/pan/pinch, snapping, rotation, scatter.
// Owns all render-side state; reports mutations through BoardCallbacks.onChange.

import { Application, Container, Graphics, Matrix, Polygon, Texture } from 'pixi.js'
import { generateCut, type PieceSpec } from './cut'

export interface BoardCallbacks {
  onChange(): void
  onSnap(): void   // a Cluster anchored to the Frame or merged
  onSolved(): void // interactive solve (not fired when restoring a solved save)
}

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
const world = new Container()
const bg = new Graphics()
let cb: BoardCallbacks = { onChange: () => {}, onSnap: () => {}, onSolved: () => {} }

let ROT = true
let TOL = 18

let W = 1, H = 1, cols = 2, rows = 2, BEV = 2
let specs: PieceSpec[] = []
let pieces: Piece[] = []
let byCell = new Map<string, Piece>()
let clusters = new Set<Cluster>()
let BOUNDS = { x0: 0, x1: 1, y0: 0, y1: 1 }
let gridG: Graphics | null = null
let gridVisible = true

export function setRot(v: boolean) { ROT = v }
export function setTol(v: number) { TOL = v }
export function setGridVisible(v: boolean) {
  gridVisible = v
  if (gridG) gridG.visible = v
}
export function counts() {
  return { pieces: pieces.length, clusters: clusters.size, cols, rows }
}
export function isSolved() { return pieces.length > 0 && clusters.size === 1 }
export function getPoses(): [number, number, number][] {
  return pieces.map((p) => [
    Math.round(p.g.x * 100) / 100, Math.round(p.g.y * 100) / 100, p.g.angle,
  ])
}

const solvedEl = () => document.getElementById('solved') as HTMLElement
let solvedNotified = false
function checkSolved(notify: boolean) {
  if (!isSolved()) return
  solvedEl().style.display = 'grid'
  if (notify && !solvedNotified) {
    solvedNotified = true
    cb.onSolved()
  }
}

const isBorder = (sp: PieceSpec) =>
  sp.row === 0 || sp.col === 0 || sp.row === rows - 1 || sp.col === cols - 1

// ---------- edges-only filter ----------
let edgesOnly = false
export function setEdgesOnly(v: boolean) {
  edgesOnly = v
  applyEdgesFilter()
  if (!v) {
    // JE detail: leaving the filter re-floats loose pieces above joined clusters
    for (const c of clusters) if (c.pieces.length === 1) world.addChild(c.pieces[0].g)
  }
}
function applyEdgesFilter() {
  for (const c of clusters) {
    const show = !edgesOnly || c.pieces.some((p) => isBorder(p.spec))
    for (const m of c.pieces) {
      m.g.visible = show
      m.g.eventMode = show ? 'static' : 'none'
      m.shadow.visible = show
    }
  }
}

// ---------- init ----------
export async function initBoard(el: HTMLElement, callbacks: BoardCallbacks): Promise<void> {
  cb = callbacks
  await app.init({ resizeTo: el, background: '#1b1b1f', antialias: true, resolution: devicePixelRatio, autoDensity: true })
  el.appendChild(app.canvas)
  app.stage.addChild(world)

  app.stage.eventMode = 'static'
  // pan/pinch surface behind the world — a hitArea on the stage itself would
  // short-circuit hit-testing and swallow the pieces' events
  bg.rect(-16000, -16000, 32000, 32000).fill(0x1b1b1f)
  bg.eventMode = 'static'
  app.stage.addChildAt(bg, 0)

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
      // block outward motion past the bounds; never yank an out-of-bounds piece
      if (dx > 0) dx = Math.min(dx, Math.max(0, BOUNDS.x1 - t.x))
      else dx = Math.max(dx, Math.min(0, BOUNDS.x0 - t.x))
      if (dy > 0) dy = Math.min(dy, Math.max(0, BOUNDS.y1 - t.y))
      else dy = Math.max(dy, Math.min(0, BOUNDS.y0 - t.y))
      for (const m of drag.cluster.pieces) { m.g.x += dx; m.g.y += dy }
    } else if (pan) {
      world.x += e.global.x - pan.lastX
      world.y += e.global.y - pan.lastY
      pan.lastX = e.global.x; pan.lastY = e.global.y
    }
  })
  app.stage.on('pointerup', endPointer)
  app.stage.on('pointerupoutside', endPointer)
  app.stage.on('pointercancel', endPointer)

  window.addEventListener('resize', () => requestAnimationFrame(fitView)) // rAF: let resizeTo settle first
  window.addEventListener('wheel', (e) => zoomAt(e.clientX, e.clientY, world.scale.x * (e.deltaY < 0 ? 1.1 : 0.9)), { passive: true })

  // shadows track their pieces (offset in board px ≈ 2-3 screen px)
  app.ticker.add(() => {
    for (const p of pieces) {
      p.shadow.position.set(p.g.x + 9, p.g.y + 12)
      p.shadow.rotation = p.g.rotation
    }
  })
}

// ---------- view ----------
export function fitView() {
  const margin = 0.75 // leave room around the board for scattered pieces
  const s = Math.min(app.screen.width / (W * (1 + margin)), app.screen.height / (H * (1 + margin)))
  world.scale.set(s)
  world.position.set(app.screen.width / 2 - (W / 2) * s, app.screen.height / 2 - (H / 2) * s)
}

function zoomAt(gx: number, gy: number, scale: number) {
  const s = Math.min(4, Math.max(0.05, scale))
  const wx = (gx - world.x) / world.scale.x
  const wy = (gy - world.y) / world.scale.y
  world.scale.set(s)
  world.position.set(gx - wx * s, gy - wy * s)
}

// ---------- pointers ----------
interface Drag { cluster: Cluster; tapped: Piece; lastX: number; lastY: number; moved: number }
let drag: Drag | null = null
let pan: { lastX: number; lastY: number } | null = null
const pointers = new Map<number, { x: number; y: number }>()
let pinchBase: { d: number; s: number } | null = null

function startDrag(piece: Piece, gx: number, gy: number) {
  drag = { cluster: piece.cluster, tapped: piece, lastX: gx, lastY: gy, moved: 0 }
  for (const m of piece.cluster.pieces) world.addChild(m.g) // bring to front
}

function endPointer(e: { pointerId: number }) {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchBase = null
  if (drag) {
    if (ROT && drag.moved < 8) rotateCluster(drag.cluster, drag.tapped)
    else snapAround(drag.cluster)
    drag = null
    cb.onChange()
  }
  pan = null
}

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
// 1) border pieces anchor to their absolute Frame position when close + upright
// 2) neighbor-merge clusters, per-axis tolerance
function snapAround(cluster: Cluster) {
  let anchored = false
  let didSnap = false
  if (cluster.angle === 0) {
    for (const p of cluster.pieces) {
      const sp = p.spec
      if (!isBorder(sp)) continue
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
          didSnap = true
          break outer
        }
      }
    }
  }
  if (anchored) didSnap = true
  if (didSnap) {
    if (edgesOnly) applyEdgesFilter() // merged-into-frame clusters become visible
    cb.onSnap()
  }
  checkSolved(true)
}

function flash(cluster: Cluster) {
  for (const m of cluster.pieces) m.g.tint = 0xaaffaa
  setTimeout(() => { for (const m of cluster.pieces) m.g.tint = 0xffffff }, 140)
}

// ---------- scatter: margin bands around the board, working space stays clear ----------
export function scatter() {
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
  solvedEl().style.display = 'none'
  cb.onChange()
}

/** apply saved poses; returns false when the pose list doesn't fit this Cut */
export function applyPoses(poses: [number, number, number][]): boolean {
  if (poses.length !== pieces.length) return false
  pieces.forEach((p, i) => {
    const [x, y, a] = poses[i]
    p.g.position.set(x, y)
    p.g.angle = a
    p.cluster.angle = a
  })
  rebuildClusters()
  return true
}

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
  checkSolved(false) // restoring a solved save shows the banner, no fanfare
}

// ---------- board construction ----------
export interface BoardParams { w: number; h: number; cols: number; rows: number; seed: number; tab: number; jit: number }

export function buildBoard(p: BoardParams, texture: Texture): void {
  W = p.w; H = p.h; cols = p.cols; rows = p.rows
  BOUNDS = { x0: -0.45 * W, x1: 1.45 * W, y0: -0.45 * H, y1: 1.45 * H }
  solvedNotified = false
  edgesOnly = false

  for (const c of world.removeChildren()) c.destroy({ children: true })
  solvedEl().style.display = 'none'

  const boardMark = new Graphics().rect(0, 0, W, H)
    .fill({ color: 0xffffff, alpha: 0.035 })
    .stroke({ width: 3, color: 0xffffff, alpha: 0.13 })
  world.addChild(boardMark)

  gridG = new Graphics()
  for (let xi = 1; xi < cols; xi++) gridG.moveTo(xi * (W / cols), 0).lineTo(xi * (W / cols), H)
  for (let yi = 1; yi < rows; yi++) gridG.moveTo(0, yi * (H / rows)).lineTo(W, yi * (H / rows))
  gridG.stroke({ width: 2, color: 0xffffff, alpha: 0.05 })
  gridG.visible = gridVisible
  world.addChild(gridG)

  const shadowLayer = new Container()
  world.addChild(shadowLayer)

  specs = generateCut(W, H, cols, rows, p.seed, p.tab / 200, p.jit / 100)
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
}

// console/debug access (used by verification harnesses; not app code)
export function debug() {
  return { app, world, bg, pieces, clusters, byCell, W, H, snapAround, rotateCluster }
}
