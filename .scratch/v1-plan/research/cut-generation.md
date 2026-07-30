# Cut generation — research findings

Ticket: "Cut generation approaches". Researched 2026-07-30 against primary sources (GitHub source, npm registry, MDN). Claims cite their source; judgments are labeled.

## TL;DR recommendation

**Write our own generator (~150–250 lines TS), borrowing Draradech's CC0 edge math, and represent every piece as an SVG path-data string fed to Canvas `Path2D`.**

- **Algorithm**: grid-with-bezier-tabs, Draradech-style — generate each *interior edge* as a 10-control-point cubic-bezier chain (tab/blank sign, size, jitter all from a seeded PRNG), then assemble each piece's **closed outline** from its 4 edges (shared edges reversed). Draradech's own code emits full-board cut *lines*, not per-piece paths, so per-piece assembly is our adaptation — small, well-understood work.
- **RNG**: replace Draradech's `Math.sin`-based PRNG with **mulberry32/sfc32** (integer-only, exactly reproducible across engines). `Math.sin` precision is implementation-dependent per MDN, so a sin-based seed stream is not guaranteed identical across browsers/architectures — unacceptable for save/resume by seed.
- **No library**: nothing on npm/GitHub is both maintained (2026) and meets the must-haves. headbreaker (the only real candidate) is unmaintained since 2023-07, uses raw `Math.random()` (not seedable), and its tabs are template-squared, not classic bezier.
- **Clipping**: Canvas. `new Path2D(svgPathString)` bridges generation → rendering → hit-testing: `ctx.clip(path)` for one-time per-piece sprite extraction into cached bitmaps, `ctx.isPointInPath(path, x, y)` for exact hit-tests. All Baseline since 2015/2016. Keeping the outline as an SVG `d` string means an SVG renderer stays a drop-in option later.

Must-have scorecard for this recommendation: seedable determinism ✅ (single seeded integer PRNG, fixed consumption order) · non-square photos + arbitrary counts ✅ (cells are W/cols × H/rows; tab size scales per cell) · per-piece closed outlines ✅ (assembled per piece, one `Path2D` each, rotation = transform before fill/stroke, hit-test in piece-local space).

---

## (a) Algorithms

### 1. Grid with bezier tabs/blanks (Draradech) — recommended base

Source read: [`jigsaw.html` in Draradech/jigsaw](https://raw.githubusercontent.com/Draradech/jigsaw/master/jigsaw.html); repo: [github.com/Draradech/jigsaw](https://github.com/Draradech/jigsaw); demo: [draradech.github.io/jigsaw/index.html](https://draradech.github.io/jigsaw/index.html). 286★. License: **CC0** for the generator (the PNG-save helper is CC-BY-SA — don't copy that part).

Verified from source:

- **Seeded, deterministic RNG** (but see caveat):

  ```js
  var seed = 1;
  function random() { var x = Math.sin(seed) * 10000; seed += 1; return x - Math.floor(x); }
  ```

  Same seed → same cut *on the same engine*. Caveat: MDN's Math reference warns "Many Math functions have a precision that's implementation-dependent… Even the same JavaScript engine on a different OS or architecture can give different results" ([MDN Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math)). So `Math.sin`-derived streams can diverge across devices. Fix: swap in **mulberry32 or sfc32** — integer/bitwise-only, exactly specified by ECMA-262, 32-bit seed, deterministic everywhere ([bryc's PRNG collection](https://github.com/bryc/code/blob/master/jshash/PRNGs.md); bryc notes mulberry32 has minor statistical quirks — irrelevant for cuts, but sfc32/splitmix32 are equally easy).

- **Tab shape**: each interior edge is a chain of cubic beziers through 10 control points; parameters `t = tabsize/200` (tab ≈ 20% of cell), `j = jitter/100`, plus per-edge random offsets `a..e` from `first()`/`next()` consumed in fixed iteration order. This is the classic "cardboard" tab silhouette.
- **Output shape — the key limitation**: `gen_dh()` emits *all horizontal cut lines*, `gen_dv()` *all vertical cut lines*, `gen_db()` the border. Continuous full-board paths, **not** per-piece closed outlines. Good for laser cutting; not directly usable for playable pieces.
- **Non-square + arbitrary counts**: width/height and `xn`/`yn` (cols/rows) are free parameters; cells are simple divisions, so any aspect ratio and any piece count works.

**Our adaptation (the actual work):**

1. For each interior edge (horizontal: `(rows-1)×cols`, vertical: `rows×(cols-1)`), generate and *store* its bezier segment list (with random tab direction sign) using the seeded PRNG in a fixed order.
2. Piece `(r,c)` outline = top edge + right edge + bottom edge **reversed** + left edge **reversed**; border edges are straight segments. Reversing a cubic chain = reverse segment order and each segment's points (P3,P2,P1,P0) — exact, no math risk.
3. Serialize each outline as `M … C … Z` SVG path data. That string is the Cut's canonical per-piece artifact (also trivially diffable/testable).

Determinism contract: cut = `f(seed, cols, rows, W, H, tabSize, jitter)` with a single PRNG stream consumed in a documented order. Golden-file test: fixed seed → fixed path strings.

Design note (judgment): for non-square photos with "arbitrary piece count N", choose `cols×rows ≈ N` minimizing `|log((W/cols)/(H/rows))|` so cells stay near-square and tabs look right.

### 2. Voronoi / organic — viable v2, not the classic look

- [d3-delaunay](https://d3js.org/d3-delaunay) computes Voronoi diagrams; `voronoi.cellPolygon(i)` returns a **closed polygon per cell** natively, and `render*` methods target Canvas. npm: **6.0.4, last published 2023-04-01** (registry via `npm view`) — mature/stable rather than active; the d3 ecosystem treats it as done. ISC.
- Determinism is trivially ours: seed the site points from the same PRNG (plus optional Lloyd relaxation, fixed iteration count). Non-square/arbitrary counts trivial (N points in a W×H box).
- But cells are convex straight-edged polygons — pieces don't *interlock*, and the brief says "classic interlocking". Adding tabs to shared Voronoi edges is possible (each Delaunay half-edge is a shared boundary) but is strictly more work than the grid for a worse match to the brief. [OrganicPuzzleJs](https://github.com/proceduraljigsaw/OrganicPuzzleJs) (cell-growth organic pieces) proves the aesthetic but is a generator app, not a reusable seedable library.
- Verdict: keep the Cut model renderer-agnostic (pieces = id + closed path + neighbor graph) and a Voronoi Cut can slot in later. Don't build now.

### 3. Others seen

- **Hex grids**: Draradech ships `jigsaw-hex.html` — same edge idea on a hex lattice. Novelty option only.
- **Template-scaled tabs (headbreaker-style)**: one fixed tab polygon scaled per edge — every joint identical, no jitter; reads as "video-game puzzle", not classic cut (see below).

## (b) OSS libraries (maintenance verified 2026-07-30)

| Library | Latest release | Last activity | Verdict |
|---|---|---|---|
| [headbreaker](https://github.com/flbulgarelli/headbreaker) | 3.0.0, **2023-07-05** (npm registry) | last commit **2023-07-27** ([commits](https://github.com/flbulgarelli/headbreaker/commits/master)) | Only real framework; see below. Fails must-haves. |
| [react-jigsaw-puzzle](https://www.npmjs.com/package/react-jigsaw-puzzle) | 1.0.5, 2023-08-09 (npm registry) | — | React game component, rectangular slices, not a cut generator. Skip. |
| jqJigsawPuzzle | — | 2016 ([topic page](https://github.com/topics/jigsaw-puzzle)) | Dead, jQuery. Skip. |
| d3-delaunay | 6.0.4, 2023-04-01 | stable | Not a jigsaw lib; Voronoi backend only. |

GitHub `jigsaw-puzzle` topic scan found no other maintained *library* — recent activity is games/apps (e.g. Puzzlefy), not reusable generators. **Conclusion: no maintained library satisfies the must-haves; the space is effectively "roll your own on Draradech's math".**

**headbreaker details** (source read): sound headless-model + rendering split (Konva.js backend — a dependency we don't otherwise want), arbitrary rows/cols and image slicing supported, per-piece closed outlines yes. But:

- Not seedable: tab/slot directions come from bare `Math.random()` — `function random(_) { return Math.random() < 0.5 ? Tab : Slot; }` with no injection point ([src/sequence.js](https://github.com/flbulgarelli/headbreaker/blob/master/src/sequence.js)). Save/resume would require serializing its full export dump instead of a seed.
- Look: default `Classic` outline **is `Squared`** — fixed template coordinates scaled to piece size; the `Rounded` variant adds bezier bezels but is still template-based with uniform joints, no per-edge jitter ([src/outline.js](https://github.com/flbulgarelli/headbreaker/blob/master/src/outline.js)). Not the classic bezier cut.
- Unmaintained ~3 years as of 2026-07.

## (c) Clipping mechanics

**The bridge fact**: `new Path2D(d)` accepts SVG path-data strings — Baseline widely available since **Aug 2016**, and available in Web Workers ([MDN Path2D()](https://developer.mozilla.org/en-US/docs/Web/API/Path2D/Path2D)). So one generated artifact (per-piece `d` string) serves SVG *and* Canvas.

**Canvas route (recommended):**

- `ctx.clip(path, fillRule?)` accepts a `Path2D`; clip is irreversible except via `save()`/`restore()`; Baseline since Jul 2015 ([MDN clip()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip)).
- **Sprite extraction, once at image load**: per piece, an `OffscreenCanvas` sized to the piece's bbox — which must include tab overhang (± tab size beyond the cell rect) — then `translate(-bbox.x, -bbox.y)`, `clip(piecePath)`, `drawImage(photo, 0, 0)` (or 9-arg `drawImage` crop, [MDN drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)). Result: one cached bitmap per piece; the play loop is plain `drawImage` + transform per piece — no per-frame clipping. Stroke the path on top for the piece edge.
- **Hit-testing**: `ctx.isPointInPath(path, x, y, fillRule?)` accepts a `Path2D`; Baseline since Jul 2015. Gotcha verified: **x,y are *unaffected by the current transform*** ([MDN isPointInPath](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isPointInPath)) — so for a dragged/rotated piece, inverse-transform the pointer into piece-local space and test against the piece's local-space `Path2D`. Rotation support falls out for free. (Cheap pre-filter: bbox test first, exact path test only on candidates — judgment.)

**SVG route (fallback/alternative):**

- Per piece: `<clipPath><path d=…></clipPath>` + `<image>` (or `<use>`) in a `<g transform=…>` ([MDN clipPath](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath)). Pros: crisp at any zoom, hit-testing and z-order free via DOM events, easy debugging. Cons (judgment, not measured): ~3–4 DOM nodes per piece and per-drag attribute updates make hundreds of pieces heavier than one canvas; per-piece bitmap caching is not under our control. Reasonable up to ~low hundreds of pieces; Canvas scales further and matches "photos → playable board" better.

Because pieces are generated as SVG `d` strings, choosing Canvas now does not foreclose SVG later — the Cut model is renderer-neutral.

## Sources

- https://github.com/Draradech/jigsaw · https://raw.githubusercontent.com/Draradech/jigsaw/master/jigsaw.html · https://draradech.github.io/jigsaw/index.html
- https://github.com/flbulgarelli/headbreaker · src/outline.js · src/sequence.js · https://github.com/flbulgarelli/headbreaker/commits/master
- npm registry via `npm view` (2026-07-30): headbreaker 3.0.0 / 2023-07-05 · d3-delaunay 6.0.4 / 2023-04-01 · react-jigsaw-puzzle 1.0.5 / 2023-08-09
- https://developer.mozilla.org/en-US/docs/Web/API/Path2D/Path2D · …/CanvasRenderingContext2D/clip · …/CanvasRenderingContext2D/isPointInPath · …/CanvasRenderingContext2D/drawImage · …/Global_Objects/Math
- https://github.com/bryc/code/blob/master/jshash/PRNGs.md
- https://d3js.org/d3-delaunay · https://github.com/proceduraljigsaw/OrganicPuzzleJs · https://github.com/topics/jigsaw-puzzle
