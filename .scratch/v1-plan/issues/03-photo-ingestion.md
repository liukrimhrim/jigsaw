# Photo ingestion pitfalls

Type: research
Status: resolved

## Question

What are the pitfalls of taking user Photos into a client-only web app, and the standard mitigations? Cover: file input + camera capture on iOS/Android browsers, HEIC support (iPhone default format!), EXIF orientation handling, downscaling giant photos (canvas size and memory limits, especially mobile Safari), `createImageBitmap`/`OffscreenCanvas` availability, and storing Photos + Puzzle progress client-side (IndexedDB blob storage, quotas, eviction and the `navigator.storage.persist()` story).

Deliverable: pitfall → mitigation table in [research/photo-ingestion.md](../research/photo-ingestion.md).

## Answer

Full findings: [research/photo-ingestion.md](../research/photo-ingestion.md)

**Recommended pipeline:** file → `createImageBitmap(file, {imageOrientation: "from-image", resizeWidth})` → worker/OffscreenCanvas slicing → IndexedDB Blob (downscaled re-encode, not the original) + progress JSON; wasm HEIC fallback feeds the same pipeline via ImageData.

- File input: `accept="image/*"` only, no `capture` attr. Do NOT list `image/heic` in accept — Safari 17+ then transcodes picks *to* HEIC; transcode behavior is undocumented/empirical, don't rely on it.
- HEIC decode: Safari 17+ only; Chrome/Edge/Firefox still none (2026). Same-device iPhone flow is safe; on decode failure lazy-load wasm `heic-decode` 2.1.0 or `libheif-js` 1.19.8 (both active; `heic2any` dormant since 2023).
- EXIF: `image-orientation: from-image` is default everywhere, but pass `{imageOrientation: "from-image"}` to `createImageBitmap` explicitly (only honored since Chrome 112/FF 111/Safari 16; `"none"` unsupported everywhere).
- Giant photos: iOS canvas area cap 4096×4096 — exceeding it silently disables drawing; cap ~2048px long edge, mind devicePixelRatio; avoid `resizeQuality` (FF 149+ only). OffscreenCanvas universal since Safari 17.
- Storage: IndexedDB Blobs. Quotas: Chrome ≤60% disk, FF min(10%, 10 GiB), Safari ~60%. Safari ITP wipes origin storage after 7 days without interaction unless persisted — call `navigator.storage.persist()` and handle `false` (Chrome/Safari decide silently). localStorage is string-only, 10 MiB — never for images.
