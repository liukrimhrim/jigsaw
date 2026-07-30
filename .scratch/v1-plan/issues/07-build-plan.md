# Write the build plan (SPEC.md)

Type: grilling
Status: resolved
Blocked by: 03, 05, 06

Note (2026-07-30): the persistence model is no longer an open decision — spike iteration 6 implemented and verified it (IndexedDB `puzzles` store, blob re-encodes, seed-deterministic pose restore, autosave). The SPEC codifies that design and its residuals (quota/eviction handling, HEIC wasm fallback) instead of deciding from scratch.

## Question

Write the destination artifact: `SPEC.md`, the v1 build plan. Commit the stack (informed by what the spike trialed), the architecture (ingestion, Cut generation, render/interaction, persistence, Library UI), the persistence model (graduating that fog), the v1 feature cut with the decided mechanics (rotation, save/resume, Library, timer & stats), and a milestone breakdown that build sessions can execute without new decisions. Grill any remaining forks; graduate or rule out whatever fog is left. Reaching the destination closes the map.

## Answer

[SPEC.md](../../../SPEC.md) written at the repo root — the destination artifact. It codifies the validated stack (PixiJS v8 + vanilla TS + Vite, own Draradech-port cut generator, texture-fill pieces with the three hard-won Pixi gotchas), the locked mechanics from tickets 05/06, the implemented-and-verified persistence design, concrete difficulty-preset defaults (marked tunable), and four milestones (M1 promote seed → app structure + golden-file determinism test; M2 play features; M3 robustness incl. HEIC fallback + storage pressure; M4 PWA + tailnet deploy). Remaining unknowns are explicitly tunables (preset numbers, celebration style, name/icon) — nothing left that blocks a build session. The map's destination is reached.
