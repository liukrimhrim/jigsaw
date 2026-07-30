# Core spike: cut, drag, snap, rotate

Type: prototype
Status: claimed
Blocked by: 01, 02

## Question

Does the recommended cut + render approach actually feel right? Build a throwaway spike (via /prototype): load a real Photo, generate an interlocking Cut, drag Pieces with touch and mouse, Snap two correct neighbors into a Cluster, rotate a Piece. React to it together: does dragging stay crisp at a realistic piece count, does rotation work on touch, does the trialed stack candidate feel pleasant to build in? The spike is an asset linked from this ticket, not production code.

Integration note from the two researches: the Cut generator must emit, per Piece, both the bezier path string AND a point-sampled outline polygon — Pixi's mesh route needs sampled points for earcut triangulation + `Polygon` hitArea, while the path string stays the source of truth (and the Canvas-2D fallback input).

## Spike built — awaiting reaction

Asset: `prototypes/core-spike/` (Vite + PixiJS v8 + vanilla TS, ~350 lines). Run: `npm run dev` in that directory → http://localhost:5173. URL params `?n=&seed=&rot=1&tol=`; bar controls pieces/rotation/ghost/snap/scatter/re-cut.

Machine-verified (drag pipeline driven end-to-end): seeded Cut is deterministic and assembles seamlessly; Piece pointerdown → drag → Snap merges Clusters with pixel-exact alignment; no false Snap at 120px miss; rigid 90° Cluster rotation. Human reaction (the actual question of this ticket) still pending.

### Iteration 2 (first user reaction, 2026-07-30)

User reactions to v1: (1) "cut is weird, edges of some pieces don't match" — CONFIRMED BUG: piece top edges were traversed reversed (stray `reverse()`), breaking outlines below row 0; also the homebrew tab curve lacked the neck undercut. Fixed by porting Draradech's exact 10-point / 3-cubic edge math (CC0, fetched from source) with per-line flip/jitter continuity. Full 24-piece programmatic assembly now renders the photo seamlessly. (2) Ghost under the board is too easy → replaced with a framed reference image top-right (DOM, toggleable). (3) Scatter must keep the working space clear → pieces now land in margin bands around a marked, empty board. (4) Seams should be more obvious/textural → 2px dark cut-line stroke + per-piece drop shadow layer (ticker-synced).

Still open for reaction: does v2's cut look right, do the seams/shadows feel real enough, drag feel at high piece counts, rotation on touch.

Validated build facts the plan should keep:
- Pieces as texture-filled `Graphics` paths (fill `{texture, matrix, textureSpace: 'global'}`) — simpler than hand-rolled meshes; Pixi tessellates internally. `textureSpace: 'global'` is mandatory or every piece gets the whole photo stretched into it.
- `autoDensity: true` must accompany `resolution: devicePixelRatio`, else the canvas CSS size ≠ renderer size and all pointer mapping breaks.
- Never put a `hitArea` on a container to make it a catch-all surface — it short-circuits hit-testing of its children. Use a background rect behind the world as the pan/pinch surface.
- Polygon hitArea + pivot-at-centroid works; rotation costs nothing extra in hit-testing (as research predicted).
- Observed while testing: dark photo crops on the dark board background are near-invisible — piece contrast (stroke/bevel/shadow or board color) is a real play-feel decision for ticket 06.
