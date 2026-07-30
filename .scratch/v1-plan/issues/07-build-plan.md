# Write the build plan (SPEC.md)

Type: grilling
Status: open
Blocked by: 03, 05, 06

Note (2026-07-30): the persistence model is no longer an open decision — spike iteration 6 implemented and verified it (IndexedDB `puzzles` store, blob re-encodes, seed-deterministic pose restore, autosave). The SPEC codifies that design and its residuals (quota/eviction handling, HEIC wasm fallback) instead of deciding from scratch.

## Question

Write the destination artifact: `SPEC.md`, the v1 build plan. Commit the stack (informed by what the spike trialed), the architecture (ingestion, Cut generation, render/interaction, persistence, Library UI), the persistence model (graduating that fog), the v1 feature cut with the decided mechanics (rotation, save/resume, Library, timer & stats), and a milestone breakdown that build sessions can execute without new decisions. Grill any remaining forks; graduate or rule out whatever fog is left. Reaching the destination closes the map.
