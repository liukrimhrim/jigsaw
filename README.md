# Jigsaw

Turn your own photos into playable jigsaw puzzles — entirely in your browser.
**Nothing is uploaded anywhere: photos, puzzles, and progress live only on your device.**

**Play: https://liukrimhrim.github.io/jigsaw/**

Open the link, add a photo (or try the demo), pick a difficulty, play.
Your browser's menu can install it as an app (iPhone/iPad: Share → Add to Home Screen).

## Features

- Classic interlocking cuts, seeded and deterministic (same puzzle every resume)
- Cluster-merge snapping + frame snapping for border pieces; optional piece rotation
- Difficulty presets (easy/medium/hard + challenge) tuning piece count, tab size, and shape variety
- Assists: side reference, board grid, edges-only filter; drag clamping so pieces never get lost
- Auto-save with a puzzle library, quiet timer with personal bests, snap/solve sounds
- Offline-capable PWA; HEIC photos work everywhere via a lazy wasm decoder

## Development

```bash
npm install
npm run dev        # dev server
npm test           # golden-file cut determinism
npm run typecheck  # strict tsc
npm run build      # production build (deployed by CI on push to main)
```

Engineering history lives in [SPEC.md](SPEC.md), [CONTEXT.md](CONTEXT.md), and the
wayfinder map under [.scratch/v1-plan/](.scratch/v1-plan/map.md).
