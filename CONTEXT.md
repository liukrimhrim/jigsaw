# Ubiquitous language

Photo-to-jigsaw web app. These are the project's terms — challenge and update them via domain-modeling, don't drift.

- **Photo** — a picture the user provides. The source of one or more Puzzles.
- **Cut** — the deterministic layout of Piece shapes generated for a Photo at a chosen piece count. Reproducible: the same Cut always yields the same Pieces.
- **Piece** — one shaped fragment of a Photo, defined by a Cut. Has a home (its correct place and orientation) and a pose (where it currently sits, how it's turned).
- **Cluster** — one or more correctly joined Pieces moving as a unit. Every Piece starts as its own Cluster; a Puzzle is solved when one Cluster remains.
- **Snap** — the moment a Cluster locks into a correct join within tolerance.
- **Board** — the surface where a Puzzle is assembled.
- **Puzzle** — a Photo + a Cut + progress (poses, Clusters, elapsed time). The unit that is played, saved, resumed, and listed.
- **Library** — the on-device collection of Puzzles.

Provisional (unresolved — see `.scratch/v1-plan/issues/06-play-feel.md`): **Tray** — a distinct holding area for unplaced Pieces, versus everything loose on the Board.
