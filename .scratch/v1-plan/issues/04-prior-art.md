# Prior art scan

Type: research
Status: resolved

## Question

What do the good existing jigsaw apps do? Scan Jigsaw Planet, Magic Jigsaw Puzzles, im-a-puzzle, Jigex, and any standout open-source/web ones. For each: Snap behavior (neighbor-merge Clusters vs absolute Board positions), rotation defaults, assists (ghost preview, edge-pieces-only filter, trays/sorting), difficulty presets and piece counts, save/Library UX, timer/stats presentation. End with a steal-list: which mechanics are worth copying for a personal-toy web app and which are engagement bloat to skip.

Deliverable: feature table + steal-list in [research/prior-art.md](../research/prior-art.md).

## Answer

Full findings: [research/prior-art.md](../research/prior-art.md)

**Cluster-merge is the universal Snap model across all four apps surveyed** (no absolute board-lock anywhere). Jigex → jigsawexplorer.com (JE); im-a-puzzle → puzzlesnap.com.

STEAL-LIST for a lean personal toy:
1. Neighbor-merge Clusters only — no board-lock; per-axis pixel tolerance (JE `snapDistance`: |dx|<=o && |dy|<=o).
2. Snap sound; a Cluster drags as one unit.
3. Rotation off by default, opt-in; wheel/arrows on desktop, tap-to-rotate-90° on touch.
4. Ghost-image toggle (JP presses `G`), or JE's box-top preview floating UNDER the pieces.
5. Edges-only filter — JE detail: exiting it re-floats loose pieces above clusters.
6. Arrange/scatter that moves only unconnected pieces.
7. Named difficulty tiers + a free piece count (PuzzleSnap 9/16/30/40/50; JP 4–300); JE's "Modify this Puzzle" re-cuts the same image.
8. Draradech CC0 bezier cut gen (seed/tabsize/jitter) as the shape reference model.
9. Auto-save with recents capped ~10 (JE, localStorage).
10. Drag-drop photo → playing in seconds; JE loads local files fully client-side.
11. H-key neighbor-waggle hint (JE).
12. Quiet elapsed timer + local personal best only.

SKIP (engagement bloat): accounts, coins/subscriptions/reward ads, daily puzzles/streaks/tournaments, public galleries/likes/embeds, global leaderboards, content libraries, multiplayer, novelty shape packs, music.

Notable: JE confirmed fully client-side via Dan Q's teardown (danq.me 2024-03-28) — state in localStorage. **grrd's Puzzle (MPL license, PWA, no ads, own photos) is an existence proof of exactly our product.** Unverified: JP timers/leaderboards, JE max piece count, Magic snap details (bot-walled).
