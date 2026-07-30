# Photo ingestion pitfalls — client-only jigsaw app

Researched 2026-07-30. All browser-support claims verified against sources fetched that day (MDN, caniuse raw data, MDN browser-compat-data API, npm registry, Apple developer forums). Empirical/undocumented behaviors are labeled.

## Pitfall → mitigation table

| # | Pitfall | Mitigation |
|---|---------|------------|
| 1 | `capture` attribute forces camera UI; picker loses "choose from library" as the primary path | Omit `capture` entirely; plain `accept="image/*"` gives the full library/camera/files picker on iOS and Android |
| 2 | Safari 17+ transcodes picked images **to HEIC** when `image/heic` appears in `accept` (even PNG/JPEG originals) | Never list `image/heic` in `accept`; use `accept="image/*"` only |
| 3 | HEIC files still arrive anyway (Files-app picks, drag-drop on desktop, AirDropped/synced files opened in Chrome/Firefox/Edge — none of which decode HEIC) | Detect decode failure (`createImageBitmap` rejects / `img.onerror`), fall back to wasm decode via `heic-decode`/`libheif-js`; lazy-load the wasm only on failure |
| 4 | EXIF-rotated photos drawn sideways/upside-down | Rely on the modern default (`image-orientation: from-image` is default everywhere since 2020); when using `createImageBitmap`, pass `{imageOrientation: "from-image"}` explicitly; never rely on `"none"` (unsupported in all browsers) |
| 5 | 48–200 MP phone photos blow iOS canvas limits (≈4096×4096 area per canvas, ~384 MB total canvas memory) — canvas silently becomes unusable | Downscale immediately on ingest via `createImageBitmap(file, {resizeWidth, resizeHeight})` (supported Chrome 54+, Firefox 98+, Safari 15+); cap the working bitmap ≤ ~4096px long edge, ideally ~2048 for the puzzle board; account for `devicePixelRatio` |
| 6 | Heavy slicing on main thread janks the UI | `OffscreenCanvas` in a worker — universal since Safari 17 (2D-only in Safari 16.x); fine to require |
| 7 | Stored photos/progress evicted by the browser | Store Blobs in IndexedDB (never dataURLs/localStorage — 10 MiB total cap); call `navigator.storage.persist()` once (Chrome 55+/Firefox 57+/Safari 15.2+); treat storage as cache: keep the downscaled bitmap, not the 20 MB original |
| 8 | Safari deletes *all* script-writable storage after 7 days of no interaction (ITP) | `persist()` exempts you per MDN; for a personal toy, also accept that re-importing the photo is a fine recovery path |
| 9 | Quota exceeded on low-storage devices | `navigator.storage.estimate()` before big writes (Chrome 61+/Firefox 57+/Safari 17+); catch `QuotaExceededError`; store downscaled JPEG/WebP blobs (~200–500 KB) instead of originals |

---

## (a) `<input type="file" accept="image/*">` + `capture` on iOS/Android

**What the picker offers.** Without `capture`, mobile OSes "display a user interface allowing the selection from an existing file or the creating of a new one" — i.e. photo library, camera, and files. With `capture="user"`/`"environment"`, the front/back camera is invoked directly. `capture` is explicitly *not Baseline* ("does not work in some of the most widely-used browsers") and is ignored on desktop, which falls back to a normal file picker. For a jigsaw app you want the library, so **don't use `capture`**.
Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture

**Does iOS transcode HEIC → JPEG on the way in?** This is **undocumented, empirically-established behavior** — Apple has no official spec for it, and it has already changed once:

- Long-standing behavior (iOS 11–16 era): when the `accept` list contains types HEIC can't satisfy (e.g. `image/jpeg` or plain `image/*` in older reports), iOS converts the HEIC photo to JPEG during picking. Documented by developer testing, not by Apple. Source: https://shkspr.mobi/blog/2020/12/coping-with-heic-in-the-browser/
- **Safari 17+ change (developer-reported):** if `accept` *includes* `image/heic` (e.g. `accept="image/*,image/heic"`), Safari hands the file over as `.heic` — and reportedly converts even JPEG/PNG originals *to* HEIC (`leo2.jpeg` → `tempImageHjyd3l.heic` in the reported test). Removing `image/heic` from `accept` restores original-format/JPEG delivery. Source: https://developer.apple.com/forums/thread/743049
- **Uncertainty:** whether plain `accept="image/*"` (which technically matches `image/heic`) triggers HEIC passthrough on current iOS 18/26 was not conclusively pinned by any primary source found; reports only confirm the explicit-`image/heic` trigger. Since Safari 17+ decodes HEIC natively anyway (see b), a same-device client-only app is safe either way — the transcode question only matters if you ever export/share.

**Mitigation:** `accept="image/*"`, no `capture`, and decode-failure fallback (pitfall 3) as the safety net rather than trusting transcoding.

## (b) HEIC/HEIF decode support in browsers, 2026

Per caniuse data (fetched 2026-07-30, raw `features-json/heif.json`):

- **Safari / iOS Safari: supported since 17.0** (through latest listed: Safari 26.x). Note in data: for Safari 11–16.6 HEIC "was supported natively in macOS/iOS, but was not supported in Safari."
- **Chrome (latest listed 153), Edge (150), Firefox (155), Samsung Internet (30): not supported.** Licensing (HEVC patent pools) is the cited blocker.
Source: https://caniuse.com/heif

**Consequence for this app:** iPhone photos picked on the same iPhone decode natively (Safari ≥17). The HEIC gap bites only when a `.heic` file reaches a Chromium/Firefox browser — desktop drag-drop of an AirDropped/synced photo, or Android users with HEIF from Samsung/Google cameras.

**Wasm fallback libraries (maintenance status from npm registry, fetched 2026-07-30):**

- `heic2any` — v0.0.4, registry last modified 2023-03-29. Convenient (Blob→Blob) but **effectively dormant**; bundles an old libheif. https://www.npmjs.com/package/heic2any
- `libheif-js` — v1.19.8, published 2025-06-12, "Emscripten distribution of libheif"; tracks upstream libheif major.minor. **Actively maintained.** https://www.npmjs.com/package/libheif-js
- `heic-decode` — v2.1.0, published 2025-07-04, wraps `libheif-js` ^1.19.8, yields raw RGBA you can `putImageData`/`ImageData`→`createImageBitmap`. **Actively maintained; recommended.** https://www.npmjs.com/package/heic-decode

The wasm payload is on the order of a megabyte-plus (characterization, not measured here) — lazy-load it only after a native decode fails, don't ship it in the main bundle.

## (c) EXIF orientation

**Is auto-orientation universal now?** Yes for `<img>`/CSS: `image-orientation: from-image` ("EXIF information contained in the image is used to rotate the image appropriately") is the **default value**, Baseline since April 2020. Per caniuse: Chrome 81+ (aspect-ratio bug with `object-fit` until 89), Firefox 26+, Safari 13.1+ / iOS 13.4+. Every 2026 browser rotates `<img>` correctly by default.
Sources: https://developer.mozilla.org/en-US/docs/Web/CSS/image-orientation , https://caniuse.com/css-image-orientation

**Where it still bites** (versions from MDN browser-compat-data, `api.createImageBitmap`, fetched 2026-07-30 via bcd.developer.mozilla.org):

- `createImageBitmap` base: Chrome 50+, Firefox 42+, Safari 15+. The `imageOrientation` **option** exists from Chrome 52 / Firefox 93 / Safari 15, but the **`"from-image"` keyword** (and it being the honored default) landed **Chrome 112, Firefox 111, Safari 16**. Practical bite: **Firefox ≤110 ignored EXIF in `createImageBitmap`** even while rotating the same photo in `<img>` — puzzle sliced sideways only on Firefox. All 2026 evergreen versions are fine; pass `{imageOrientation: "from-image"}` explicitly anyway (free, self-documenting).
- The `"none"` (ignore-EXIF) value is **supported by no browser** (BCD lists only Deno 1.40) — you cannot reliably opt *out* of EXIF rotation via this API. If you ever need raw sensor orientation, you'd have to strip EXIF yourself. Not needed for this app.
- `drawImage` from a decoded `<img>`/`ImageBitmap` inherits the already-applied orientation in modern browsers, so the safe pipeline is: File → `createImageBitmap(file, {imageOrientation:"from-image", resizeWidth…})` → draw. One decode path, orientation handled once.
- Cross-origin caveat (irrelevant here, all local): `image-orientation: none` never overrides EXIF for non-same-origin images. Source: https://developer.mozilla.org/en-US/docs/Web/CSS/image-orientation
Source for BCD versions: https://bcd.developer.mozilla.org/bcd/api/v0/current/api.createImageBitmap.json

## (d) Downscaling giant photos

**iOS Safari canvas limits** (the phone taking the photos is also the most constrained renderer):

- MDN: "most" browsers exceed 10,000×10,000, "notably iOS devices limit the canvas size to only 4,096 x 4,096 pixels", and "Exceeding the maximum dimensions or area renders the canvas unusable — drawing commands will not work" — **silently**, no exception. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas
- The iOS limit is an **area** limit: width × height > 16,777,216 (= 4096²) throws/fails ("Canvas area exceeds the maximum limit"). Source: https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/
- **Total** canvas memory across all canvases on a page: reported 224 MB historically, raised to **384 MB in iOS 15** ("Total canvas memory use exceeds the maximum limit (384 MB)"). **Developer-reported, not officially documented; not re-verified for iOS 18/26** — treat as order-of-magnitude budget. Sources: https://developer.apple.com/forums/thread/687866 , https://developer.apple.com/forums/thread/112218
- Remember `devicePixelRatio`: a "2048px" canvas sized in CSS pixels at DPR 3 is a 6144px backing store — count device pixels against the budget. (Arithmetic, not a sourced claim.)
- I could not fetch the canvas-size project's per-browser table (site is JS-rendered); MDN links it as the reference for exact per-device numbers: https://jhildenbiddle.github.io/canvas-size/#/?id=test-results — **desktop per-browser maxima unverified here**, but irrelevant if you design to the iOS ceiling.

**Downscale API:** `createImageBitmap(file, {resizeWidth, resizeHeight, resizeQuality})` decodes and scales off the DOM, without ever materializing the full-resolution canvas. Support (BCD, same source as (c)): resizeWidth/Height **Chrome 54+, Firefox 98+, Safari 15+**; `resizeQuality` Chrome 54+/Safari 15+ but **Firefox only from 149 (listed as planned)** — don't depend on quality hints, default quality is fine for puzzle pieces. A 48 MP HEIC decoded at full res is ~192 MB of RGBA before you even draw; resize-at-decode is the difference between working and a tab crash on an iPhone. (Last sentence: arithmetic + characterization.)

**OffscreenCanvas** (slice pieces in a worker): per caniuse — **Chrome 69+, Edge 79+, Firefox 105+, Safari/iOS 17.0+** (Safari 16.2–16.6 partial, 2D contexts only; Firefox 44–104 flag-gated WebGL-only). Universal in 2026; safe to require. Source: https://caniuse.com/offscreencanvas

**Recommended ingest pipeline:** `file → createImageBitmap(file, {imageOrientation:"from-image", resizeWidth: ≤2048 long edge}) → (worker, OffscreenCanvas) slice pieces → transfer bitmaps back`. If `createImageBitmap(file)` rejects (HEIC on Chromium/Firefox), run the wasm fallback, build an `ImageData`, and continue identically.

## (e) Client-side storage for photos + puzzle progress

All figures from MDN's storage quotas page (fetched 2026-07-30): https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

**Quotas per origin:**

- **Chrome/Chromium (Chrome, Edge):** up to **60% of total disk**, same in best-effort and persistent modes.
- **Firefox:** best-effort = smaller of 10% of disk or **10 GiB** (group limit); persistent = up to 50% of disk (8 TiB cap), no group limit.
- **Safari (17+ model):** ~**60% of disk** for browser apps; ~**15%** for in-app WKWebView embeds — except web apps saved to Home Screen/Dock, which get the full browser quota. Cross-origin frames get 1/10 of parent quota. Older Safari: 1 GiB then permission prompts.

**Eviction:** all browsers evict under storage pressure by **LRU of whole origins** — when an origin goes, *all* its data goes at once (IndexedDB + Cache API + OPFS), never partially. Persistent-mode origins are skipped.

**`navigator.storage.persist()`:** supported **Chrome 55+, Firefox 57+, Safari/iOS 15.2+** (versions from MDN browser-compat-data `api/StorageManager.json`, fetched 2026-07-30; page: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist ). Behavior differs: **Firefox shows a permission prompt; Chrome and Safari decide silently from engagement heuristics** (may return `false` — handle both outcomes, don't gate features on it). `estimate()` is Chrome 61+/Firefox 57+/**Safari 17+** only.

**Safari ITP 7-day eviction:** origins with **no user interaction (click/tap) in the last 7 days** get all script-written storage deleted (when tracking prevention is on, which is the default). Per MDN's table, **persistent-mode data is exempt** — so `persist()` matters more on Safari than anywhere else. A personal toy used weekly is naturally safe; one left for a month may come back empty — design the app so a lost photo just means re-importing it.

**localStorage is unusable for images:** Web Storage is capped at **10 MiB total (5 MiB each for localStorage + sessionStorage), throwing `QuotaExceededError`** beyond that (same MDN page) — one modern photo exceeds it. It's also synchronous (blocks main thread) and string-only, forcing base64 (+~33% size). **Use IndexedDB storing `Blob` objects directly** (structured clone handles Blobs; no encoding overhead), one object store for image blobs keyed by puzzle id, one for progress JSON (piece positions, elapsed time). Store the **downscaled** blob you actually play from (re-encode to JPEG/WebP ~200–500 KB), not the multi-MB original — makes every quota and eviction concern above mostly academic.

---

### Uncertainty ledger

- iOS HEIC→JPEG file-input transcoding: **empirical, undocumented, already changed once (Safari 17)**; plain-`image/*` passthrough behavior on iOS 18/26 unpinned. Mitigated structurally (decode-failure fallback), so the uncertainty doesn't propagate into the design.
- iOS 384 MB total canvas memory: developer-forum figure (iOS 15), not re-verified for current iOS.
- Desktop per-browser max canvas dimensions: not verified (canvas-size table unfetchable); design targets the verified iOS ceiling instead.
- caniuse "not supported" for HEIC in Chrome/Edge/Firefox reflects caniuse data as fetched 2026-07-30 (latest listed: Chrome 153, Edge 150, Firefox 155).
