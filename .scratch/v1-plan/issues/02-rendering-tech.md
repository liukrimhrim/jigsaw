# Rendering & interaction tech

Type: research
Status: resolved

## Question

What rendering + interaction approach handles our worst case — up to ~500–1000 Pieces, each an irregularly clipped draggable sprite that can be rotated, on mobile Safari and Chrome? Compare Canvas 2D (layered canvases, dirty-rect strategies), WebGL (PixiJS or raw), and DOM/SVG nodes. Cover: hit-testing rotated irregular shapes, drag + pinch-zoom + pan gestures coexisting with a rotation gesture, texture/memory limits for large Photos on mobile, and realistic Piece-count ceilings per approach. Note which stack candidates (vanilla TS, or a framework) each approach pairs with naturally.

Deliverable: recommendation + perf-budget notes in [research/rendering-tech.md](../research/rendering-tech.md).

## Answer

Full findings: [research/rendering-tech.md](../research/rendering-tech.md)

**PixiJS v8 (WebGL) + vanilla TS + Vite.** Pieces = textured Meshes (earcut-triangulated outlines, UV-mapped into ONE ≤4096² photo atlas) — never per-piece masks (Pixi's own perf guide warns against hundreds of masks).

- Maintenance verified 2026-07-30: v8.18/8.19 current with monthly releases; WebGL default renderer (WebGPU exists in Safari 26 but stay on WebGL).
- Headroom: official Bunnymark does 100k moving sprites at ~15ms CPU; 1000 Pieces is ~1% of that — the margin is the argument (no first-party mobile benchmark).
- Hit-testing: `piece.hitArea = new Polygon(outline)` — Pixi inverse-transforms the pointer into local space, so rotation is free.
- Gestures: Pointer Events only (Baseline incl. mobile Safari): `touch-action: none`, `setPointerCapture`, pointerId Map; hit piece → drag, miss → pan, second finger → pinch (distance delta) or piece-rotate (angle delta); handle `pointercancel` on iOS.
- iOS limits (WebKit source): per-canvas area cap 8192×8192 device px; the old total-canvas-memory cap was removed in Safari 17 — failure mode is now jetsam, stay frugal. Cap photo atlas at 4096² (99% device support), query `MAX_TEXTURE_SIZE` at runtime.
- Rejected: Canvas 2D fine ≤~200–300 pieces but full-repaint pan/zoom at 1000 rotated draws on DPR-3 phones is the cliff; DOM/SVG clip-path isn't GPU-composited, ~100-piece ceiling.
