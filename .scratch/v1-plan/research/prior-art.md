# Prior art: web jigsaw apps (2026-07-30)

Scope: Jigsaw Planet, Jigsaw Explorer (jigex.com now 301-redirects there), PuzzleSnap (im-a-puzzle.com now 301-redirects there), Magic Jigsaw Puzzles (ZiMAD), plus OSS. Method: help/FAQ pages, store listings, page HTML, repo sources. No native installs; players are JS apps, so anything only observable by playing is marked **unverified**. jigsawexplorer.com and ZiMAD's zendesk sit behind Cloudflare bot checks (not bypassed); JE facts come from search-indexed snippets of its own help pages plus a reverse-engineering blog post.

## Feature table

| App | Snap model | Rotation | Assists | Difficulty presets | Save / library | Timer / stats |
|---|---|---|---|---|---|---|
| Jigsaw Planet | Neighbor-merge clusters; sound on connect | Optional per puzzle (author-set); wheel / arrow keys / right-click; touch: tap → rotate icons | Ghost (G), preview (I), Arrange/Disarrange, multi-select | 4–300 pieces, 8 shape styles (0..7), rotation flag | Auto-save unfinished (limited if signed out); private puzzles per account | Pause (P), progress %; timer/leaderboards unverified |
| Jigsaw Explorer | Neighbor-merge; per-axis pixel `snapDistance` | Off by default; toggle at start or via "Modify this Puzzle"; wheel / arrows, even without holding a piece; touch: tap-tap | Box top (floats under pieces), Edges Only, H-key neighbor waggle, mystery mode | Piece count changeable any time via "Modify this Puzzle"; max unverified | Auto-save via cookies/localStorage; remembers 10 uncompleted; custom photo via "Open" button or shareable URL | Completion time exists (unverified detail) |
| PuzzleSnap (im-a-puzzle) | Drag & build; snap details unverified | No rotation control in player UI (HTML "rotate" hits are CSS) — unverified | Preview, Arrange, Edges, Overlay, Fullscreen, Solve | Easy 9 / Medium 16 / Hard 30 / Very hard 40 / Supreme 50; 13 cut styles | Save button; account only for profile/gallery; maker: drag-drop ≤50 MB, link share | 00:00:00 timer + high-score leaderboard (Pieces/Time/Score) |
| Magic Jigsaw (ZiMAD) | Group moves ("move pieces in groups"); snap details unverified | "Rotation mode for real puzzle pros" — opt-in | Preview, sorting, hints | 6 levels, up to 1200 pieces | Multiple puzzles in progress w/ progress shown; own-photo puzzles | "No clock" pitch; tournaments/leaderboards instead |
| headbreaker (OSS lib) | Neighbor-merge: `tryConnectWith`/`autoconnect`, `proximity` radius | Not offered (n/a) | Validators, connection requirements | `horizontalPiecesCount`×`verticalPiecesCount` | `export()`/`import()` state | n/a |
| grrd's Puzzle (OSS PWA) | unverified | Yes (README) | Own photos, difficulty choice | Multiple levels | Offline PWA, free, no ads | unverified |
| Puzzle Massive (OSS) | Cluster joins, 5000+ pieces, movement moderation | No (unverified) | — | Very large counts | Server-side, multiplayer | Karma system (anti-abuse) |

## Per-app notes

### Jigsaw Planet — jigsawplanet.com
- Snap = **cluster merge**: "You can connect pieces together. The connection is accompanied with a sound. You can move together connected pieces as one piece." (https://www.jigsawplanet.com/?rc=gamehelp)
- Rotation controls: mouse wheel up/down = left/right rotate; left/right arrow keys; "Ctrl + right mouse button to rotate left or press only the right mouse button to rotate right" while dragging; touch: "Tap on the piece and then tap on the appeared left or right rotation icon." (gamehelp)
- Rotation is a per-puzzle setting (`rotation` 0/1): "The puzzle contains randomly rotated pieces, it is more difficult." Enabled only if the author allowed it. (https://www.jigsawplanet.com/?rc=faq)
- Assists: ghost picture toggle (key G), image preview toggle (I), pause (P). "Arrange": "Arranges pieces in free desktop space. It leaves already connected pieces on their places." Multi-select by dragging over empty space (selected pieces "turn red"), Ctrl+click to add/remove. (gamehelp)
- Difficulty: custom play via context menu "Play As → Custom" or URL params — pieces "4..300, nearest possible value is used", `shape` "0..7" (8 shape styles), `savegame` 0/1. (faq)
- Save: "Automatic save for unfinished games (limited for unsigned users)" (gamehelp); private uploads: "Your private puzzles are not available to other users." (faq)
- Timer/best-times leaderboards per puzzle: **unverified** — player requires JS; help pages don't document a timer. Progress shown as % at bottom. (gamehelp)

### Jigsaw Explorer — jigsawexplorer.com (jigex.com → 301 here)
Facts below are from jigsawexplorer.com's own help pages as surfaced in search snippets (direct fetch blocked by Cloudflare): https://www.jigsawexplorer.com/help/
- Rotation: off unless enabled via "the button with the circular arrow icon" on the start panel; can toggle mid-game via menu → "Modify this Puzzle". Rotate with scroll wheel or left/right arrow keys, "whether or not the mouse has picked up a piece"; touch: tap to select, keep tapping to rotate.
- Edges Only button "hide[s] the interior pieces while you assemble the edge pieces"; toggling it off brings "all of the puzzle's loose pieces… to the top… over any joined sections" — solves the pieces-lost-under-clusters problem.
- Box top: completed-image window that sits on the mat and "will remain underneath all puzzle pieces so as not to obscure them."
- Neighbor hint: hover a piece edge, press "H", "the neighboring puzzle piece will waggle for a few seconds."
- Mystery mode: preview disabled until completion.
- Save/resume: "Puzzles in progress are automatically saved… Jigsaw Explorer will remember the ten most recently uncompleted puzzles" (cookies required, not in private mode).
- Custom photos: "Open" button in the player loads a local image file; custom puzzles shareable by URL (https://www.jigsawexplorer.com/create-a-custom-jigsaw-puzzle/, /create-a-custom-jigsaw-puzzle-help/). Piece count changeable before/after start ("Modify this puzzle"); exact max **unverified**.
- Internals (Dan Q, https://danq.me/2024/03/28/solving-jigsawexplorer/): snap check is per-axis pixel tolerance — `Math.abs(Bn.x – n) <= o && Math.abs(Bn.y – i) <= o` with a `snapDistance` variable; puzzle state and image URLs live in localStorage; "mystery" is a client-side flag in `jigex-prog.js`. I.e. **neighbor snap with a rectangular tolerance, all client-side**.

### PuzzleSnap — puzzlesnap.com ("formerly I'm a Puzzle"; im-a-puzzle.com → 301 here)
- Player UI (static HTML of https://puzzlesnap.com/puzzle/pear-jigsaw-puzzle): "Puzzle setup" offers cut styles Classic, Hearts, Star, Halloween, Leaves, Christmas, Easter, Holiday, Honeycomb, Mystery, Pines, Covid, Pets; difficulties "Easy (9 pcs), Medium (16 pcs), Hard (30 pcs), Very hard (40 pcs), Supreme (50 pcs)"; "Helpers: Preview, Arrange, Edges, Fullscreen"; more actions: Overlay, Restart, Save, Embed, Solve; timer "00:00:00"; "High score leaders" table (Pieces / Time / Score, Rank / Username).
- No rotation control appears in the setup/helpers UI; the 24 "rotate" hits in the homepage HTML are CSS transforms. Rotation: **assumed absent, unverified**.
- Homepage FAQ (https://puzzlesnap.com/): "From 9 pieces… to 50 pieces"; "No. Pick any puzzle and start playing. An account only matters if you want to save puzzles to a profile or upload your own"; "The site runs on display ads. There's nothing to buy and nothing to upgrade."
- Maker (https://puzzlesnap.com/make-puzzle): "Drag and drop an image here, or click to browse", "JPG, PNG, or GIF · up to 50MB", playable "in under a minute", share "the link to anyone — they can play… no account or signup required on their end"; public-gallery submissions manually reviewed (~1 day). Also Math/Quiz gimmick modes.
- Engagement layer: Daily Puzzle, site leaderboard, likes/plays counters, related-puzzles rail, embed codes.

### Magic Jigsaw Puzzles — ZiMAD
Source: App Store listing https://apps.apple.com/us/app/magic-jigsaw-puzzles-games-hd/id439873467 (also https://zimad.com/game/magic-jigsaw-puzzles/, Google Play com.bandagames.mpuzzle.gp)
- "6 difficulty levels with up to 1200 pieces"; "Rotation mode for real puzzle pros"; "move pieces in groups"; preview of finished puzzle; sorting capabilities; hints; "no clock to destroy your calm moments".
- Work on several puzzles at once with visible progress; create puzzles from own photos.
- Monetization/engagement: 40,000+ image gallery updated daily, coins, daily rewards, level-up bonuses, weekly tournaments, packs $2.99–$4.99, subscription, optional 30-second ads, paid ad removal, Facebook/Instagram/TikTok community. Rotation-toggle FAQ exists on their zendesk but is bot-walled: **unverified detail**.

### Open source
- **headbreaker** (https://github.com/flbulgarelli/headbreaker) — JS jigsaw framework, pure domain model, headless-testable; Konva.js canvas painter optional. Neighbor-merge via `tryConnectWith()` / `autoconnect()`; snap radius via `proximity`; grid via `autogenerate({horizontalPiecesCount, verticalPiecesCount})`; per-piece connection validators; state persistence via `export()`/`import()`. Closest ready-made model for a client-only app.
- **Draradech/jigsaw** (https://github.com/Draradech/jigsaw, demo https://draradech.github.io/jigsaw/index.html) — CC0 SVG cut-line generator; source (`jigsaw.html`) parameterizes `seed`, `tabsize`, `jitter`, `xn`/`yn` grid, corner `radius`, bezier-curve tabs; hex variant (`jigsaw-hex.html`). The standard recipe for classic-looking pieces.
- **Puzzle Massive** (https://github.com/jkenlooper/puzzle-massive) — MMO jigsaw, "randomly generated classic interlocking pieces" 5000+; "Player's piece movements are moderated automatically in order to prevent abusive behavior." Server-heavy; relevant only as proof clusters scale.
- **grrd's Puzzle** (https://github.com/grrd01/Puzzle, demo https://grrd01.github.io/Puzzle/) — HTML5 PWA, kinetic.js canvas, "various images or play with your own pictures at the level of difficulty of your choice", rotation supported, offline-capable, "free, no ads, no in-app purchases". Existence proof for the exact product shape we want.
- **jiggie.fun** — co-op web jigsaw ("Assemble jigsaw puzzles on your own or with your friends"); source availability not confirmed; internals **unverified**.

## STEAL-LIST

1. **Neighbor-merge clusters as the one snap model** — every serious player does cluster merge, not board-position lock. Per-axis pixel tolerance a la Jigsaw Explorer's `snapDistance` (`|dx|<=o && |dy|<=o`), i.e. headbreaker's `proximity`.
2. **Snap feedback**: sound + the merged cluster dragging as one piece (Jigsaw Planet).
3. **Rotation off by default, opt-in per puzzle**; wheel/arrow-keys on desktop, tap-selected-piece-to-rotate-90° on touch (JP + JE conventions).
4. **Ghost/preview**: ghost image on the board (JP `G`) or JE's box-top that floats *under* pieces; single-key toggles (G/I/P).
5. **Edges-only filter**, with JE's fix: leaving the filter re-floats loose pieces above joined clusters.
6. **Arrange/scatter** that spreads only unconnected pieces and leaves clusters alone (JP/PuzzleSnap "Arrange").
7. **Named difficulty tiers + free piece-count** (PuzzleSnap's 5 tiers read well; JP's 4–300 custom range) — and JE's "Modify this Puzzle" trick of re-cutting the same image at a new count.
8. **Classic bezier cut from Draradech (CC0)**: seed/tabsize/jitter parameters give organic pieces nearly free; headbreaker as reference or dependency for the connect/validate/persist loop.
9. **Auto-save always, zero ceremony**: localStorage state, resume by reopening; a recents list capped like JE's "ten most recently uncompleted puzzles".
10. **Upload = drag-drop file → playing in seconds** (PuzzleSnap maker; JE's local "Open" button needs no server at all — perfect for client-only).
11. **Neighbor-hint waggle on a key press** (JE `H`) — tiny code, big stuck-player relief.
12. **Quiet timer + personal best per puzzle** (PuzzleSnap timer presentation, minus leaderboard) — Magic's "no clock" calm is worth honoring: show elapsed, never pressure.

## SKIP-LIST (engagement bloat — do not copy)

- Accounts, sign-in gates, profiles (all four gate something on login; one user needs none).
- Coins/currency, packs, subscriptions, reward ads, paid ad-removal (Magic), display ads (PuzzleSnap).
- Daily puzzles, streaks, weekly tournaments, events, level-up bonuses (Magic, PuzzleSnap).
- Public galleries, moderation queues, likes/plays counters, related-puzzle rails, embeds, social shares (PuzzleSnap, JP, Magic).
- Global leaderboards/high-score tables vs strangers (PuzzleSnap) — keep only local personal bests.
- 40k-image content libraries and category taxonomies — the user's photos are the library.
- Multiplayer, karma/anti-abuse machinery (Puzzle Massive, jiggie).
- Novelty cut packs (hearts/Covid/holiday shapes) and music collections — one classic cut (+ optional square grid) suffices.
