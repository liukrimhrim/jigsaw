# Map: photo-to-jigsaw web app — v1 plan

Label: wayfinder:map

## Destination

A committed build plan — `SPEC.md` at the repo root — for a client-only web app that turns a user's Photos into playable on-screen jigsaw Puzzles. Personal-toy scope: no backend, no accounts; Photos never leave the device. V1 feature set: the core loop (pick Photo → Cut → drag/Snap to solve), Piece rotation, save/resume, Puzzle Library, timer & stats. The map is done when build sessions can execute the plan without new decisions.

## Notes

- Domain language lives in [CONTEXT.md](../../CONTEXT.md) — use its terms (Photo, Cut, Piece, Cluster, Snap, Board, Puzzle, Library) in every ticket.
- Skills: /grilling + /domain-modeling for decision tickets, /prototype for the spike, /research for AFK tickets.
- Standing prefs: lean builds — platform features before dependencies; client-only is a hard constraint, not a default.
- Tracker: local markdown (this directory, per issue-tracker-local conventions). Research findings land as files in `research/` and are linked from tickets, not pasted in.

## Decisions so far

<!-- one line per closed ticket: gist + link. Pre-map grilled decisions live in Destination and Out of scope. -->

## Not yet specified

- **Persistence model** — how save/resume, the Library, and best times are stored client-side (storage API, image storage, quotas). Sharpens after [Photo ingestion pitfalls](issues/03-photo-ingestion.md) — quota realities may make it a non-decision.
- **Difficulty presets** — piece-count tiers and what else varies per tier (rotation on/off?). Sharpens after [Play-feel decisions](issues/06-play-feel.md).
- **Polish layer** — sound, haptics, completion celebration, PWA install/offline. Sharpens once the core loop feels good in the spike.

## Out of scope

- Physical/printable puzzle output (cut templates, laser files) — destination is on-screen play only.
- Native iOS, desktop, or Godot builds — v1 is web.
- Backend anything: accounts, hosted user data, shareable puzzle links, multiplayer co-solving — personal-toy ambition rules these past the destination.
