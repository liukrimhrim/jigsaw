# Cut generation approaches

Type: research
Status: claimed

## Question

How should we generate classic interlocking jigsaw Cuts client-side? Survey: algorithms (grid-with-bezier tabs/blanks à la Draradech's generator; voronoi/organic alternatives), existing OSS libraries (headbreaker.js and whatever else is maintained), and the clipping mechanics (SVG paths vs Canvas `Path2D`). Must-haves to evaluate against: seedable determinism (same seed → same Cut, required for save/resume), non-square Photos and arbitrary piece counts, and per-Piece path extraction (each Piece needs its own outline for rendering, hit-testing, and rotation).

Deliverable: recommendation + sketch of the chosen approach in [research/cut-generation.md](../research/cut-generation.md).
