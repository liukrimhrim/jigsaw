# Cut generation approaches

Type: research
Status: resolved

## Question

How should we generate classic interlocking jigsaw Cuts client-side? Survey: algorithms (grid-with-bezier tabs/blanks à la Draradech's generator; voronoi/organic alternatives), existing OSS libraries (headbreaker.js and whatever else is maintained), and the clipping mechanics (SVG paths vs Canvas `Path2D`). Must-haves to evaluate against: seedable determinism (same seed → same Cut, required for save/resume), non-square Photos and arbitrary piece counts, and per-Piece path extraction (each Piece needs its own outline for rendering, hit-testing, and rotation).

Deliverable: recommendation + sketch of the chosen approach in [research/cut-generation.md](../research/cut-generation.md).

## Answer

Full findings: [research/cut-generation.md](../research/cut-generation.md)

**Roll our own Cut generator (~150–250 lines TS) on Draradech's CC0 grid-with-bezier-tabs edge math; no library.** Pieces are SVG path-data strings → `new Path2D(d)`; render/hit-test on Canvas.

- Draradech (github.com/Draradech/jigsaw, CC0): seeded 10-control-point bezier edges, non-square + arbitrary cols/rows built in — but emits full-board cut LINES; per-piece closed outlines are our adaptation: store per-edge bezier chains, assemble each piece from its 4 edges (shared edges reversed).
- Replace its `Math.sin`-based RNG with mulberry32/sfc32: Math-function precision is implementation-dependent per MDN, which breaks cross-device seed determinism; integer PRNGs are exact. Cut = f(seed, cols, rows, W, H, tabSize, jitter) with fixed consumption order — golden-file testable.
- Libraries: none viable. headbreaker is the only real framework but unmaintained (last publish/commit 2023-07) with square-template tabs and unseedable bare `Math.random()` direction choices. Nothing else maintained as of 2026.
- Sprite extraction ONCE at load: per piece, OffscreenCanvas sized to bbox incl. tab overhang → translate + clip(path) + drawImage; play loop uses cached bitmaps, no per-frame clipping. Hit-test via `isPointInPath(path, x, y)` in piece-local space (inverse-transform the pointer), so rotation falls out free.
- SVG clipPath route stays a drop-in fallback for ≤ low hundreds of pieces; voronoi (d3-delaunay) has no interlock — v2 organic mode only.
