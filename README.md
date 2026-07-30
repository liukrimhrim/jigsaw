# Jigsaw

Turn your own photos into playable jigsaw puzzles — entirely in your browser.
**Nothing is uploaded anywhere: photos, puzzles, and progress live only on your device.**

**Play now: https://liukrimhrim.github.io/jigsaw/** — no account, no download, just open the link.

## Install it on your device (optional, no technical skills needed)

The game already works at the link above. "Installing" simply gives it its own
icon and window, and it keeps working without internet afterwards.

**Windows / Linux / Mac — using Chrome or Edge**

1. Open https://liukrimhrim.github.io/jigsaw/
2. Look at the right end of the address bar for a small **install icon**
   (a screen with a down arrow; hovering it says "Install Jigsaw").
3. Click it, then click **Install**.
4. Done — the game opens in its own window and shows up with your other apps.

**Mac — using Safari**

1. Open the link in Safari.
2. In the menu bar choose **File → Add to Dock…**, then click **Add**.

**iPhone / iPad**

1. Open the link in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. The puzzle icon appears on your home screen like any app.

**Android**

1. Open the link in **Chrome**.
2. Tap the **⋮** menu (top right), then **Install app**
   (on some phones it says **Add to Home screen**), then confirm.

To remove it later, delete it like any other app. Remember: your photos and
saved puzzles stay only in the browser/device where you made them — switching
devices starts a fresh puzzle library.

### 安裝到你的裝置（繁體中文）

遊戲開啟連結即可玩，安裝只是多一個圖示、並可離線使用。

- **電腦（Chrome / Edge）**：開啟上面的連結 → 點網址列右側的**安裝圖示** → 按「安裝」。
- **Mac（Safari）**：開啟連結 → 選單列 **檔案 → 加入 Dock…** → 按「加入」。
- **iPhone / iPad**：用 Safari 開啟連結 → 點**分享**按鈕（向上箭頭）→ **加入主畫面** → 按「加入」。
- **Android（Chrome）**：開啟連結 → 右上 **⋮** 選單 → **安裝應用程式**（或「加到主畫面」）。

照片與拼圖進度只存在你自己的裝置上，不會上傳到任何地方。

## Features

- Classic interlocking cuts, seeded and deterministic (same puzzle every resume)
- Cluster-merge snapping + frame snapping for border pieces; optional piece rotation
- Difficulty presets (easy/medium/hard + challenge) tuning piece count, tab size, and shape variety
- Assists: side reference with hover magnifier, board grid, edges-only filter; palette-adaptive board color for contrast
- Auto-save with a puzzle library, quiet timer with personal bests, snap/solve sounds
- English + 繁體中文 (auto-detected, switchable in the bar)
- Offline-capable PWA; HEIC photos work everywhere via a lazy wasm decoder

## Development (for programmers)

```bash
npm install
npm run dev        # dev server
npm test           # golden-file cut determinism
npm run typecheck  # strict tsc
npm run build      # production build
npm run deploy     # build + publish to GitHub Pages (gh-pages branch)
```

Engineering history lives in [SPEC.md](SPEC.md), [CONTEXT.md](CONTEXT.md), and the
wayfinder map under [.scratch/v1-plan/](.scratch/v1-plan/map.md).
