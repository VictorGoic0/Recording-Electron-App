# Progress: ClipForge

## Current Status: VideoPlayer Seek Bug Under Investigation

---

### What Works (Completed)

- ✅ All original features: video import, preview, timeline, trim, export, recording, multi-track
- ✅ Security: CSP headers, `local-video://` custom protocol
- ✅ UX: App starts maximized, DevTools no longer auto-open
- ✅ Zustand refactor complete: `useMediaStore` + `usePlaybackStore`, no React Context
- ✅ `App.jsx` cleaned up: 103 lines, import logic in `useImport` hook
- ✅ `MediaLibrary` subscribes to store directly, no prop drilling for clip actions
- ✅ `VideoPlayer` architecture corrected:
  - `<video>` always mounted
  - Imperative event listeners, no React synthetic event props
  - No stale closures
  - `preload="auto"`
  - `currentTime`, `isSeeking` removed from Zustand store

### Known Bugs

- ✅ **First-import seek failure** — FIXED. Root cause: `net.fetch` proxy to `file://` added async latency on cold cache; Chromium's media pipeline finalized pipeline init before the first range response arrived and marked the resource non-seekable. Fix: replaced `net.fetch` with `fs.createReadStream` + explicit `206 Partial Content` / `Content-Range` / `accept-ranges: bytes` headers in the `local-video://` protocol handler. Also added `getMimeType()` helper and removed unused `net` import.

### What's Not Started

- ❌ PR #10: Polish & Packaging
- ❌ Stretch: Save/Load Projects
- ❌ Stretch: Undo/Redo
- ❌ Stretch: Transitions / Text Overlays

---

## State Architecture (Current)

| Store | State | Key Actions |
|---|---|---|
| `useMediaStore` | `clips`, `selectedClipId` | `addMedia`, `addMultipleMedia`, `removeMedia`, `updateMedia`, `selectClip` |
| `usePlaybackStore` | `playhead`, `duration`, `isPlaying`, `tracks`, `zoom`, `selectedTimelineClipId` | `setPlayhead`, `setDuration`, `setIsPlaying`, all track/clip ops |

**VideoPlayer local state**: `readOnlyCurrentTime`, `isSeeking`, `volume`, `isMuted`, `error`
