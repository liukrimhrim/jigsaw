# Map: photo-to-jigsaw web app — v1 plan

Label: wayfinder:map

## Destination

A committed build plan — `SPEC.md` at the repo root — for a client-only web app that turns a user's Photos into playable on-screen jigsaw Puzzles. Personal-toy scope: no backend, no accounts; Photos never leave the device. V1 feature set: the core loop (pick Photo → Cut → drag/Snap to solve), Piece rotation, save/resume, Puzzle Library, timer & stats. The map is done when build sessions can execute the plan without new decisions.

## Notes

- Domain language lives in [CONTEXT.md](../../CONTEXT.md) — use its terms (Photo, Cut, Piece, Cluster, Snap, Board, Puzzle, Library) in every ticket.
- Skills: /grilling + /domain-modeling for decision tickets, /prototype for the spike, /research for AFK tickets.
- Standing prefs: lean builds — platform features before dependencies; client-only is a hard constraint, not a default.
- Tracker: local markdown (this directory, per issue-tracker-local conventions). Research findings land as files in `research/` and are linked from tickets, not pasted in.

## Decisions so far

<!-- one line per closed ticket: gist + link. Pre-map grilled decisions live in Destination and Out of scope. -->

- [Cut generation approaches](issues/01-cut-generation.md) — roll our own seeded bezier-tab generator on Draradech's CC0 math (no viable library); pieces as SVG path strings → Path2D, sprites clipped once at load, hit-test in piece-local space.
- [Rendering & interaction tech](issues/02-rendering-tech.md) — PixiJS v8 + vanilla TS + Vite; Pieces as UV-mapped triangulated meshes from one ≤4096² photo atlas (no per-piece masks), Polygon hitArea makes rotation free, Pointer Events for all gestures.
- [Photo ingestion pitfalls](issues/03-photo-ingestion.md) — pipeline: file input → `createImageBitmap({imageOrientation, resizeWidth})` → worker slicing → IndexedDB Blobs (downscaled re-encode) + `navigator.storage.persist()`; HEIC wasm fallback outside Safari; cap ~2048px long edge for iOS canvas limits.
- [Prior art scan](issues/04-prior-art.md) — Cluster-merge Snapping is the universal model; steal ghost toggle, edges-only filter, opt-in rotation, seconds-to-playing flow; skip all engagement bloat; grrd's Puzzle (MPL PWA) is an existence proof of our exact product.

## Not yet specified

- **Difficulty presets** — piece-count tiers and what else varies per tier (rotation on/off?). Sharpens after [Play-feel decisions](issues/06-play-feel.md).
- **Polish layer** — sound, haptics, completion celebration, PWA install/offline. Sharpens once the core loop feels good in the spike.

## Out of scope

- Physical/printable puzzle output (cut templates, laser files) — destination is on-screen play only.
- Native iOS, desktop, or Godot builds — v1 is web.
- Backend anything: accounts, hosted user data, shareable puzzle links, multiplayer co-solving — personal-toy ambition rules these past the destination.
