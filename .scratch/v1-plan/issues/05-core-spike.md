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

### Iteration 3 (second user reaction, 2026-07-30)

User reactions to v2 → all implemented: (1) rotation ON by default (pieces spawn rotated; `?rot=0` to disable). (2) Border/corner Pieces auto-snap to their absolute frame position when close + upright — a deliberate exception to pure Cluster-merge; frame position wins when an anchored cluster then merges with neighbors. Verified by real drag: corner piece released ~5px off → locked pixel-exact to the frame. (3) Layout refits on window resize (`resize` → rAF → fitView; verified at 375×812: board recentered exactly). (4) Menu bar moved out of the canvas: body is a flex column, Pixi `resizeTo` targets the #app element, `overflow:hidden` + `display:block` guard against stale sizes — canvas bottom == bar top, zero overlap. (5) Seam realism: added scale-aware bevel pass per piece — offset dark inner stroke lower-right + light stroke upper-left over the cut-line stroke and drop shadows.

Play-feel deltas for ticket 06: rotation-default-on and border-frame-snapping are user decisions made here; bevel realism still to be judged (user: "still not looking realistic" pre-bevel — v3 verdict pending).

### Iteration 5 (2026-07-30)

Borrowed from grrd's Puzzle source dive (user approved): default tab size settled at 15; **grid assist** (toggleable cell outlines on the board, image-neutral placement help); **drag clamping** to board + scatter ring (±0.45·W/H) via the held piece, so no cluster can be flung out of reach — verified: an 8000px synthetic fling stopped exactly on the bounds corner. Orientation-aware presets + "gold" multiplier + completion ding + persisted assist toggles left for tickets 06/07.

### Iteration 6 (2026-07-30) — Library + save/resume

User requested the two v1 persistence features; built per the photo-ingestion research: `store.ts` = IndexedDB `puzzles` store (photo as ≤2048px JPEG re-encode ~340KB + 256px thumb + params + poses + solved), `navigator.storage.persist()` requested. Ingestion: `createImageBitmap({imageOrientation:'from-image'})` → canvas re-encode. Library overlay = entry screen: cards (thumb, name, pieces, resume/solved, delete), "+ new from photo" file input, demo card. Progress autosaves (debounced 400ms on every drop/rotate/scatter + visibilitychange flush); restore regenerates the Cut from the stored seed, applies poses, and `rebuildClusters()` reunites exactly-posed neighbors without moving them. In-game piece-count/tab/vary changes and "new cut" create a NEW puzzle from the same photo (JE "modify" pattern). VERIFIED: full reload restored all poses to 0.01 px (rotations included), merged pair survived as one cluster; HEIC failures alert and point at the planned wasm fallback.

(1) Bevels toned down (alpha 0.16/0.11, narrower, smaller offset). (2) User insight: difficulty ≠ just piece count — shape complexity/confusability matters. Exposed the generator's two shape axes as sliders + URL params: **tab** (10–40, Draradech units; small knobs = subtler joins = harder) and **vary** (jitter 0–13; LOW variety = pieces look alike = harder — verified at tab 12/vary 0: near-identical squares). Difficulty space for the plan is now 4-dimensional: piece count × rotation × tab size × shape variety — ticket 06 should fold these into named presets rather than exposing raw sliders in the real app.

Validated build facts the plan should keep:
- Pieces as texture-filled `Graphics` paths (fill `{texture, matrix, textureSpace: 'global'}`) — simpler than hand-rolled meshes; Pixi tessellates internally. `textureSpace: 'global'` is mandatory or every piece gets the whole photo stretched into it.
- `autoDensity: true` must accompany `resolution: devicePixelRatio`, else the canvas CSS size ≠ renderer size and all pointer mapping breaks.
- Never put a `hitArea` on a container to make it a catch-all surface — it short-circuits hit-testing of its children. Use a background rect behind the world as the pan/pinch surface.
- Polygon hitArea + pivot-at-centroid works; rotation costs nothing extra in hit-testing (as research predicted).
- Observed while testing: dark photo crops on the dark board background are near-invisible — piece contrast (stroke/bevel/shadow or board color) is a real play-feel decision for ticket 06.
