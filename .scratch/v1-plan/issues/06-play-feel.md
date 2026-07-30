# Play-feel decisions

Type: grilling
Status: resolved
Blocked by: 04, 05

Decisions already reacted-in during the spike iteration (inherit, don't reopen): reference image lives on the side, never as a ghost under the board (too easy); scatter places Pieces in margin bands so the Board stays clear; seams stay visible on assembled Clusters (dark cut-line stroke + drop shadows for depth).

## Answer

Play-feel is locked — partly by spike practice, partly by grilling (2026-07-30):

**From spike practice** (user-reacted): Snap = neighbor-merge Clusters + absolute frame-snap for border Pieces (frame wins on conflict); snap tolerance default 18 board px (slider-tunable); rotation ON by default, tap-to-rotate-90°, global toggle; assists = side reference image + grid overlay (both toggleable, default on) + subtle piece bevels + drop shadows; scatter to margin bands, re-scatter moves only unconnected Pieces; drag clamped to board + ring; **no Tray** — loose Pieces live in the margin bands of the pannable Board (CONTEXT.md updated).

**From grilling**: (1) Difficulty = **3 presets + persisted "challenge" toggle** — easy/medium/hard set orientation-aware piece counts AND tune tab/variety under the hood; challenge ≈3×s counts; rotation stays independent; custom axes behind an expander. (2) Timer = **quiet elapsed + per-puzzle best shown on solve** — no pressure presentation. (3) Sounds = **snap click + completion ding, on by default**, one persisted mute. (4) **Edges-only filter ships in v1** with the exit-re-float fix.

Concrete preset numbers are tunable defaults, codified in SPEC.md.

## Question

Reacting to the spike and the prior-art findings, lock the play-feel decisions: Snap semantics (neighbor-relative Cluster merging vs absolute Board positions — or both), Snap tolerance and feedback; rotation interaction (tap-to-rotate-90° vs two-finger twist) and whether rotation is tied to difficulty; assists (ghost image, edge-pieces-only filter); whether a **Tray** exists or Pieces lie loose on a pannable Board — resolve the provisional Tray term in CONTEXT.md either way; difficulty presets (piece counts, what varies per tier — may graduate the difficulty fog).
