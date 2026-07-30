# Core spike: cut, drag, snap, rotate

Type: prototype
Status: open
Blocked by: 01, 02

## Question

Does the recommended cut + render approach actually feel right? Build a throwaway spike (via /prototype): load a real Photo, generate an interlocking Cut, drag Pieces with touch and mouse, Snap two correct neighbors into a Cluster, rotate a Piece. React to it together: does dragging stay crisp at a realistic piece count, does rotation work on touch, does the trialed stack candidate feel pleasant to build in? The spike is an asset linked from this ticket, not production code.

Integration note from the two researches: the Cut generator must emit, per Piece, both the bezier path string AND a point-sampled outline polygon — Pixi's mesh route needs sampled points for earcut triangulation + `Polygon` hitArea, while the path string stays the source of truth (and the Canvas-2D fallback input).
