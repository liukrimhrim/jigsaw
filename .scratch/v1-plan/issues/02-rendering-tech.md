# Rendering & interaction tech

Type: research
Status: claimed

## Question

What rendering + interaction approach handles our worst case — up to ~500–1000 Pieces, each an irregularly clipped draggable sprite that can be rotated, on mobile Safari and Chrome? Compare Canvas 2D (layered canvases, dirty-rect strategies), WebGL (PixiJS or raw), and DOM/SVG nodes. Cover: hit-testing rotated irregular shapes, drag + pinch-zoom + pan gestures coexisting with a rotation gesture, texture/memory limits for large Photos on mobile, and realistic Piece-count ceilings per approach. Note which stack candidates (vanilla TS, or a framework) each approach pairs with naturally.

Deliverable: recommendation + perf-budget notes in [research/rendering-tech.md](../research/rendering-tech.md).
