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

- ❌ **First-import seek failure**: On first import only, arrow key seeks and slider scrubbing call `video.currentTime = time` correctly but the video does not move. Second import works. Full investigation in `CONTEXT.md`.
  - Leading hypothesis: `local-video://` protocol missing byte-range request support (required by Chromium for seeking)
  - Next to try: `seeked` event listener to detect silent reset, switch to `file://`, or register protocol with `stream: true`

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
