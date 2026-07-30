# Rendering & interaction tech — findings

Researched 2026-07-30. All version/limit claims verified against primary sources on this date.

## TL;DR recommendation

**PixiJS v8 (WebGL renderer) + vanilla TS + Vite.** Render each piece as a **textured Mesh** (piece outline triangulated, UV-mapped into ONE photo texture atlas) — **never per-piece masks**. Hit-test with per-piece `hitArea` polygons (Pixi inverse-transforms the pointer, so rotation is free). Drive all input through Pointer Events with `touch-action: none` + `setPointerCapture`. Cap the photo texture at 4096×4096 (query `MAX_TEXTURE_SIZE` at runtime). 1000 pieces is ~1% of Pixi's demonstrated sprite budget — the only approach of the three with real headroom at the worst case.

Fallback sanity: Canvas 2D is viable to ~200–300 pieces with layered canvases; DOM/SVG falls over well before 500. Neither survives the stated worst case comfortably.

## (b) WebGL / PixiJS — chosen

**Maintenance (verified 2026-07-30):** v8 is the current stable major — 8.18.1 per the [versions page](https://pixijs.com/versions), 8.19.0 on [npm](https://www.npmjs.com/package/pixi.js?activeTab=versions) (published ~May 2026); active monthly release blog through [June 2026](https://pixijs.com/blog/june-2026). v7 and older are explicitly "not maintained anymore". Supports WebGL and WebGPU; **default renderer is WebGL since v8.1.0** because WebGPU browser behavior was inconsistent ([release notes](https://github.com/pixijs/pixijs/releases/tag/v8.1.0)). WebGPU did ship in Safari 26.0 for iOS/macOS ([webkit.org](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)), but there is no reason to prefer it here — stay on the WebGL default.

**Performance evidence:** official v8 launch benchmark ([Bunnymark](https://pixijs.com/blog/pixi-v8-launches)): 100,000 moving sprites at ~15 ms CPU / ~2 ms GPU per frame (desktop, WebGL). Our worst case (1000 pieces) is 1% of that sprite count; even a 10–50× mobile discount leaves large headroom. *Uncertainty: no first-party mobile benchmark exists; the margin is the argument, not a measured mobile number.*

**The critical design constraint — no per-piece masks.** Pixi's own [performance guide](https://pixijs.com/8.x/guides/concepts/performance-tips) ranks masks: scissor-rect (axis-aligned rect) fastest, stencil (Graphics) second, sprite masks "really expensive" (they are filters), and warns outright against "100s of masks". 500–1000 stencil masks would also break sprite batching. Correct architecture:

1. Upload the photo once as a single texture (≤4096², see limits below).
2. For each piece, triangulate its outline (earcut — already inside Pixi's Graphics) into a `MeshGeometry`; set UVs = the piece's rectangle in the photo.
3. All pieces share one texture → they batch; the whole board is a handful of draw calls. Rotation is a per-piece transform, free.
4. Bevel/shadow, if wanted, via a second shared texture or vertex tinting — not per-piece filters.

**Hit-testing rotated irregular pieces:** set `piece.hitArea = new Polygon(outlinePoints)` (local coordinates). Pixi's event system walks the tree and tests the pointer in each object's local space, so rotation/scale are handled by the existing inverse world transform; `hitArea` also *skips* the more expensive bounds/geometry test ([events guide](https://pixijs.com/8.x/guides/components/events)). Set `interactiveChildren = false` on non-interactive containers and `eventMode = 'none'` on decorations (perf guide, same link). Color-picking (render IDs to an offscreen buffer, read pixel) is the O(1) alternative but is overkill at 1000 polygons of ~30–60 points — a linear polygon scan top-down is microseconds; keep color-picking in the back pocket, don't build it. Simplify the hit polygon (the knob outline can be coarser than the render outline).

## Interaction model (applies to any renderer)

Primary sources: [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) (Baseline: widely available since July 2020 — includes mobile Safari and Chrome), [MDN pinch-zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures).

- One listener set on the canvas; `touch-action: none` in CSS so Safari/Chrome never steal the gesture for scroll/native-zoom.
- On `pointerdown`: hit-test. Hit a piece → **piece mode**, `setPointerCapture(pointerId)`; miss → **board mode** (pan).
- Track active pointers in a `Map<pointerId, point>`. Board mode + second pointer → pinch-zoom/pan (MDN two-pointer pattern: cache both events, compare distance for scale, midpoint for pan). Piece mode + second pointer → **piece rotation**: rotate by the change in angle `atan2(p2−p1)` between the two pointers — same math as pinch, angle instead of distance.
- Handle `pointercancel` (iOS fires it on system gestures/notifications) by dropping the pointer from the map and settling the piece.
- Single-finger rotation (e.g. rotate handle or double-tap-to-rotate-90°) is a UX decision, not a tech constraint — the two-finger twist is the only part needing multi-pointer plumbing.

## Memory limits — iOS Safari (verified in WebKit source)

- **Per-canvas area limit: 8192 × 8192 = 67,108,864 *device* pixels on iOS-family**, 16384² elsewhere — it's an *area* cap, not per-dimension, and counts device pixels (mind DPR≈3). Primary source: [`CanvasBase.cpp` `maxCanvasArea()`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp), current main (`#if PLATFORM(IOS_FAMILY) return 8192 * 8192`). This matches community canvas-size testing that the old 4096² limit was raised around iOS 18 ([canvas-size](https://github.com/jhildenbiddle/canvas-size)).
- **The notorious "Total canvas memory use exceeds the maximum limit (224/384 MB)" cap was REMOVED** — WebKit commit [6bd11f3](https://github.com/WebKit/WebKit/commit/6bd11f3792f05b4e58e5647bf173212879fa62cc) (2023-06-29, [bug 195325](https://bugs.webkit.org/show_bug.cgi?id=195325)), shipped via [STP 174](https://webkit.org/blog/14390/release-notes-for-safari-technology-preview-174/) → Safari 17. Canvases now compete under normal page memory; the commit itself warns the failure mode is now jetsam (tab kill), not a console error. So: stay frugal anyway. If we ever support iOS ≤16, the old caps (e.g. 384 MB on iOS 15) and the resize-to-1×1 release trick apply ([pqina writeup](https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)).
- **WebGL texture size:** ~99% of devices support ≥4096², only ~50% more ([webgl2fundamentals cross-platform notes](https://webgl2fundamentals.org/webgl/lessons/webgl-cross-platform-issues.html)). *Uncertainty: exact per-iPhone `MAX_TEXTURE_SIZE` values (8192 vs 16384 on recent A-series) not confirmed from a primary source.* Policy: downscale the user photo to fit 4096×4096 at import (that's 64 MB RGBA — plenty for a puzzle), and query `gl.getParameter(gl.MAX_TEXTURE_SIZE)` before ever going bigger.

## (a) Canvas 2D — viable small, risky at worst case

Techniques per [MDN Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): layered canvases (settled-pieces layer redrawn rarely; active-piece layer redrawn per frame), pre-render each clipped piece once to an offscreen canvas (pay `clip()` once, then `drawImage` per frame), integer coordinates, `alpha:false` on the base layer, batch state changes.

- Hit-testing is actually pleasant: `isPointInPath(path2d, x, y)` takes a Path2D + fill rule, and the test point is in *canvas* space while the path honors the current transform — so `setTransform(pieceMatrix); isPointInPath(path, px, py)` correctly tests rotated irregular outlines. Baseline since 2015. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/isPointInPath))
- The killer is full-board repaint during pan/zoom and end-game: 500–1000 rotated `drawImage`s of pre-rendered pieces per frame on a DPR-3 phone canvas. Dirty rects help drag (1 piece moving) but not pan/zoom (everything moves).
- **Ceiling: no first-party benchmark exists — labeled estimate:** comfortable ≤~200–300 pieces; 500–1000 with per-frame full repaints on mobile is where it gets frame-droppy. Also: 500–1000 offscreen piece canvases each carry padding overhead; total canvas memory would need care even without the removed WebKit cap.
- Pairs with: vanilla TS + Vite, zero deps. The right choice only if we hard-cap at a few hundred pieces.

## (c) DOM/SVG — falls over; rejected for worst case

One `<div>`/`<svg>` per piece with `clip-path` and a shared photo via `background-position`:

- `clip-path` is **not a GPU-composited property** — animating/moving clipped elements falls back to CPU raster work per frame ([Chrome dev blog on hardware-accelerated animations](https://developer.chrome.com/blog/hardware-accelerated-animations) lists only transform/opacity/filter as composited, with clip-path merely "planned"). O'Reilly's SVG performance chapter likewise flags clipping as one of the more expensive CSS effects ([ch. 19](https://oreillymedia.github.io/Using_SVG/extras/ch19-performance.html)).
- 1000 elements × (clip + transform + independent stacking) → layer explosion or constant re-raster; per-element GPU layers cost width×height×4 bytes each. Hit-testing does come free (browser respects clip-path for pointer events), which is why this is tempting — but it's the rendering that dies. *Uncertainty: no rigorous 1000-element clip-path benchmark found; conclusion follows from the compositing model plus the above sources.*
- **Ceiling (estimate): fine ≤~100 pieces, degrading beyond, unacceptable at 500+.** Pairs naturally with any framework (React/Svelte) — irrelevant since rejected for the worst case.

## Perf budget (recommended stack)

| Item | Budget | Basis |
|---|---|---|
| Photo texture | ≤4096×4096 RGBA = 64 MB | universal device support (webgl2fundamentals) |
| Piece geometry | 1000 pieces × ~40–80 verts ≈ <100k tris | trivial vs bunnymark's 200k sprite quads |
| Draw calls | ~1–5 (single atlas, batched meshes) | Pixi batching (perf guide) |
| Hit-test | linear polygon scan, top-down, per pointerdown only | `hitArea` skips bounds machinery |
| Frame budget | 16.6 ms; expect <4 ms render on mid phones | extrapolated from bunnymark — *estimate* |
| iOS canvas element | drawing-buffer area ≤ 8192² device px | WebKit `maxCanvasArea()` |

## Stack pairing

PixiJS is framework-agnostic; **vanilla TS + Vite** is its natural, officially-templated pairing and all the UI this toy needs (menus can be plain DOM over the canvas). `@pixi/react` exists if a framework is ever wanted — do not add one now.
