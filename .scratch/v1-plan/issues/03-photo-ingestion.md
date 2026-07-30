# Photo ingestion pitfalls

Type: research
Status: claimed

## Question

What are the pitfalls of taking user Photos into a client-only web app, and the standard mitigations? Cover: file input + camera capture on iOS/Android browsers, HEIC support (iPhone default format!), EXIF orientation handling, downscaling giant photos (canvas size and memory limits, especially mobile Safari), `createImageBitmap`/`OffscreenCanvas` availability, and storing Photos + Puzzle progress client-side (IndexedDB blob storage, quotas, eviction and the `navigator.storage.persist()` story).

Deliverable: pitfall → mitigation table in [research/photo-ingestion.md](../research/photo-ingestion.md).
