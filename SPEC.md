# Jigsaw — v1 build plan

Personal-toy web app: turn your own Photos into playable on-screen jigsaw Puzzles.
Client-only — no backend, no accounts; Photos never leave the device.
Domain language: [CONTEXT.md](CONTEXT.md). Decisions provenance: [.scratch/v1-plan/](.scratch/v1-plan/map.md).

Everything here was validated in the spike (now the app seed at `prototypes/core-spike/`)
or decided on its tickets. Build sessions execute; they don't re-decide.

## Stack (validated)

- **PixiJS v8** (WebGL) + **vanilla TypeScript** + **Vite**. No framework.
- Pieces = texture-filled `Graphics` paths — `fill({texture, matrix, textureSpace: 'global'})`
  with path coords in photo-pixel space. NOT per-piece masks, NOT hand-rolled meshes.
- `Application.init({resizeTo: appEl, resolution: devicePixelRatio, autoDensity: true})` —
  autoDensity is mandatory or pointer mapping breaks.
- Never put a `hitArea` on a container to catch stray pointers (it swallows children's
  hit-tests); the pan/pinch surface is a background rect behind the world.
- Own Cut generator (`src/cut.ts`): faithful Draradech port (CC0) — 10-control-point
  tab curve, 3 cubics/edge, per-line flip/jitter continuity — driven by **mulberry32**
  (integer PRNG; cross-device determinism contract:
  `Cut = f(seed, cols, rows, W, H, tab, jitter)`, fixed stream order).
- Dependencies: `pixi.js` only (+ lazy `heic-decode` wasm in M3). Resist additions.

## Mechanics (locked on tickets 05/06)

- **Snap**: neighbor-merge Clusters, per-axis tolerance (default 18 board px);
  border Pieces also frame-snap to absolute position when upright + close;
  frame position wins when an anchored Cluster merges. Merge aligns exactly.
- **Rotation**: ON by default (independent toggle). Pieces spawn at random 90° steps;
  tap rotates 90°; clusters rotate rigidly around the tapped Piece. Snapping requires
  matching orientation.
- **Assists**: side reference image (never a board ghost) + cell-grid overlay,
  both toggleable, default on; subtle per-piece bevel (light upper-left / shade
  lower-right) + drop-shadow layer; green flash on merge.
- **Space**: no Tray — scatter into margin bands around the marked, empty Board;
  re-scatter moves only unconnected Pieces; drag clamped to board + ring
  (±0.45·W/H) via the held Piece; pan/pinch/wheel zoom; view refits on resize.
- **Difficulty** = presets over 4 axes (count × rotation × tab × variety):
  three orientation-aware presets + persisted **challenge** toggle (≈3× counts);
  rotation independent; raw axes behind a "custom…" expander.
  Tunable defaults: easy 24 / medium 96 / hard 192; challenge → 60 / 240 / 480;
  tab 18/15/13, variety 8/4/1 per tier. Cap ~500 pieces (perf headroom is far
  higher, UX is not).
- **Timer**: quiet elapsed clock, pauses when tab hidden; on solve show time +
  per-Puzzle best. No pressure presentation.
- **Sounds**: snap click + completion ding, on by default, one persisted mute.
- **Edges-only filter** (v1): hide loose interior Pieces while building the Frame;
  on exit, re-float loose Pieces above joined Clusters.

## Photos & persistence (implemented + verified)

- Ingestion: `createImageBitmap(file, {imageOrientation: 'from-image'})` →
  ≤2048px long edge → canvas JPEG re-encode (~85%) + 256px thumb.
  Never list `image/heic` in the file-input accept (Safari transcodes *to* HEIC).
- Store: IndexedDB `jigsaw/puzzles` — one record per Puzzle: photo Blob, thumb Blob,
  dims, seed, cols/rows, tab/jit, poses `[x,y,angle][]`, solved, timestamps.
  `navigator.storage.persist()` requested once (Safari ITP wipes unpersisted origins).
- Autosave: debounced 400ms after every drop/rotate/scatter + visibilitychange flush.
- Restore: regenerate Cut from seed, apply poses, `rebuildClusters()` reunites
  exactly-posed neighbors without moving them. Verified pose-exact across reloads.
- Library = entry screen: cards (thumb/name/pieces/resume-or-solved/delete),
  "+ new from photo", demo card. Changing cut params mid-game creates a NEW
  Puzzle of the same Photo (never mutates a save).

## Milestones

**M1 — Promote seed to app.** `git mv prototypes/core-spike/{src,index.html,public,package.json,tsconfig.json} .`
(app lives at repo root; `.scratch/` stays). Split `main.ts` (~500 lines) into
`board.ts` (Pixi board + interaction), `game.ts` (lifecycle/persist), `ui.ts`
(bar/library DOM); `cut.ts`/`store.ts` stay. Add `npm run typecheck` (tsc --noEmit)
and the one required test: **golden-file determinism** — `npm test` regenerates
`Cut(seed=1, 4×6, …)` and asserts path-string hash equality against a committed
golden. Timer field added to PuzzleRec (`elapsedMs`, `bestMs`).

**M2 — Play features.** Difficulty presets + challenge toggle in a new-game dialog
(replaces raw-slider bar for normal flow; custom expander keeps the axes);
quiet timer + best-on-solve; sounds (2 short assets, WebAudio, persisted mute);
edges-only filter with exit-re-float; completion celebration (ding + one CSS
confetti burst — style is a tunable); persisted assist toggles (localStorage).

**M3 — Robustness.** Lazy HEIC wasm fallback (`heic-decode` on decode failure →
same ingest pipeline); storage pressure UX (show Library size, surface
`persist()` denial, delete affordance); phone perf pass at 480 pieces with
rotation (shadow layer may switch to a single baked texture if needed);
pointer edge cases (pointercancel, second-finger-on-piece pinch).

**M4 — Ship.** PWA: manifest + service-worker precache (offline play), icon;
fullscreen button (grrd borrow). Deploy (revised 2026-07-30: public reach for
non-technical players beats tailnet): public GitHub repo + GitHub Pages via
Actions on push to main, app at https://liukrimhrim.github.io/jigsaw/
(`base: '/jigsaw/'`). Photos still never leave the player's device.

## Out of scope (map verdicts — do not drift)

Physical/print output; native or Godot builds; anything backend: accounts,
hosted data, share links, multiplayer; engagement bloat: streaks, coins, ads,
leaderboards, social. Voronoi/organic cuts = possible v2, Cut model already
renderer-neutral.

## Done means

A phone-installable PWA where: pick a photo → playing in seconds; close the tab
mid-puzzle and resume pose-exact; three difficulty presets + challenge feel
distinct; border pieces click into the frame; solving ends in a ding, a time,
and a personal best. All without a byte leaving the device.
