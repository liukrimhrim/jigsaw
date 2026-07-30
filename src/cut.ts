// PROTOTYPE — throwaway spike code, not production.
// Seeded classic Cut generator — faithful port of Draradech's CC0 jigsaw edge
// math (github.com/Draradech/jigsaw): 10-control-point tab curve, 3 cubics per
// interior edge, per-line flip/jitter continuity. mulberry32 replaces the
// Math.sin PRNG for cross-device determinism.
// Stream consumption order (the determinism contract): all horizontal lines
// top→bottom (each left→right), then all vertical lines left→right (each
// top→bottom).

export interface Pt { x: number; y: number }
/** One cubic segment: p0, c1, c2, p1 */
export type Seg = [Pt, Pt, Pt, Pt]

export interface PieceSpec {
  row: number
  col: number
  segs: Seg[]      // closed outline, board coords, clockwise
  poly: Pt[]       // sampled outline, board coords
  centroid: Pt
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const straight = (a: Pt, b: Pt): Seg[] => {
  const lerp = (t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  return [[a, lerp(1 / 3), lerp(2 / 3), b]]
}

const reverse = (segs: Seg[]): Seg[] =>
  segs.map((s) => [s[3], s[2], s[1], s[0]] as Seg).reverse()

function sample(segs: Seg[], perSeg = 8): Pt[] {
  const out: Pt[] = []
  for (const [p0, c1, c2, p1] of segs) {
    for (let i = 1; i <= perSeg; i++) {
      const t = i / perSeg, u = 1 - t
      out.push({
        x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
        y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
      })
    }
  }
  return out
}

export function generateCut(
  W: number, H: number, cols: number, rows: number, seed: number,
  tabsize = 0.1, // Draradech default: tabsize slider 20 → t = 20/200
  jitter = 0.04, // jitter slider 4 → j = 4/100
): PieceSpec[] {
  const rand = mulberry32(seed)
  const uniform = (mn: number, mx: number) => mn + rand() * (mx - mn)
  const rbool = () => rand() > 0.5
  const cw = W / cols, ch = H / rows
  const t = tabsize, j = jitter

  // per-edge params, carried across a line exactly like the original
  let a = 0, b = 0, c = 0, d = 0, e = 0, flip = false
  const next = () => {
    const flipold = flip
    flip = rbool()
    a = flip === flipold ? -e : e
    b = uniform(-j, j); c = uniform(-j, j); d = uniform(-j, j); e = uniform(-j, j)
  }
  const first = () => { e = uniform(-j, j); next() }

  // Draradech's p0..p9 in (v = along-edge 0..1, w = across-edge, cell units) → 3 cubics
  const chain = (P: (v: number, w: number) => Pt): Seg[] => {
    const s = flip ? -1 : 1
    const p = (v: number, w: number) => P(v, w * s)
    return [
      [p(0, 0), p(0.2, a), p(0.5 + b + d, -t + c), p(0.5 - t + b, t + c)],
      [p(0.5 - t + b, t + c), p(0.5 - 2 * t + b - d, 3 * t + c), p(0.5 + 2 * t + b - d, 3 * t + c), p(0.5 + t + b, t + c)],
      [p(0.5 + t + b, t + c), p(0.5 + b + d, -t + c), p(0.8, e), p(1, 0)],
    ]
  }

  // hEdges[yi-1][xi]: horizontal line at y = yi*ch, drawn left→right
  const hEdges: Seg[][][] = []
  for (let yi = 1; yi < rows; yi++) {
    const line: Seg[][] = []
    first()
    for (let xi = 0; xi < cols; xi++) {
      line.push(chain((v, w) => ({ x: (xi + v) * cw, y: yi * ch + w * ch })))
      next()
    }
    hEdges.push(line)
  }
  // vEdges[xi-1][yi]: vertical line at x = xi*cw, drawn top→bottom
  const vEdges: Seg[][][] = []
  for (let xi = 1; xi < cols; xi++) {
    const line: Seg[][] = []
    first()
    for (let yi = 0; yi < rows; yi++) {
      line.push(chain((v, w) => ({ x: xi * cw + w * cw, y: (yi + v) * ch })))
      next()
    }
    vEdges.push(line)
  }

  const corner = (cx: number, ry: number): Pt => ({ x: cx * cw, y: ry * ch })
  const pieces: PieceSpec[] = []
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const tl = corner(cIdx, r), tr = corner(cIdx + 1, r)
      const br = corner(cIdx + 1, r + 1), bl = corner(cIdx, r + 1)
      const segs: Seg[] = [
        ...(r === 0 ? straight(tl, tr) : hEdges[r - 1][cIdx]),          // top: stored L→R already
        ...(cIdx === cols - 1 ? straight(tr, br) : vEdges[cIdx][r]),    // right: stored T→B
        ...(r === rows - 1 ? straight(br, bl) : reverse(hEdges[r][cIdx])),
        ...(cIdx === 0 ? straight(bl, tl) : reverse(vEdges[cIdx - 1][r])),
      ]
      const poly = sample(segs)
      let sx = 0, sy = 0
      for (const q of poly) { sx += q.x; sy += q.y }
      pieces.push({
        row: r, col: cIdx, segs, poly,
        centroid: { x: sx / poly.length, y: sy / poly.length },
      })
    }
  }
  return pieces
}
