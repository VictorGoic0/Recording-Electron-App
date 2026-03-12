# Active Context: ClipForge

## Current Work Focus

**Phase**: Playhead sync — VideoPlayer ↔ Timeline
**Date**: March 12, 2026
**Status**: Seek bug fixed. Planning playhead implementation.

## What Was Completed This Session

### Code Cleanup (all shipped)
- `App.jsx` reduced from 275 → 103 lines
  - `handleClipSelect` and `handleRemoveClip` deleted (were wrappers around store actions)
  - Import logic extracted to `src/renderer/hooks/useImport.js`
  - `handleRevealInExplorer` moved into `MediaLibrary`
- `MediaLibrary` now subscribes to `useMediaStore` directly
- `VideoPlayer` major refactor:
  - `<video>` element always mounted (was conditionally rendered — caused mount-race)
  - All event listeners moved to imperative `addEventListener` inside clip-load `useEffect`
  - `preload="auto"` added
  - `readOnlyCurrentTime` is local `useState` (was in Zustand store)
  - `isSeeking` is local `useState` (was in Zustand store)
  - `currentTime` and `setCurrentTime` removed from Zustand store entirely
  - `isSeeking`/`setIsSeeking` removed from Zustand store
  - No `useCallback`, no stale closures — all handlers read `videoRef.current` directly
  - `seekingFromVideoRef` flag removed (legacy from two-store era)

### Zustand Store (playbackStore)
- `currentTime` field removed
- `setCurrentTime` action removed
- `isSeeking`/`setIsSeeking` removed
- `setDuration` no longer references `currentTime`

### Seek Bug Fix (shipped)
- Root cause: `net.fetch` proxy to `file://` added async latency; Chromium media pipeline marked resource non-seekable on cold cache before first range response arrived
- Fix: `local-video://` protocol handler now uses `fs.createReadStream` + explicit `206 Partial Content` / `Content-Range` / `accept-ranges: bytes`
- Added `getMimeType()` helper; removed unused `net` import from main.js

## Immediate Next Steps

Implement playhead sync: VideoPlayer `readOnlyCurrentTime` → `usePlaybackStore.playhead`, bidirectional (Timeline drag → VideoPlayer seek).

## Active Architecture

```
useMediaStore          usePlaybackStore
─────────────          ────────────────
clips                  playhead (absolute seconds)
selectedClipId         duration
                       isPlaying
                       tracks
                       zoom
                       selectedTimelineClipId
```

### VideoPlayer local state
- `readOnlyCurrentTime` — drives time display and progress bar only
- `isPlaying` — from store (also consumed by Timeline)
- `duration` — from store (also consumed by Timeline/export)
- `isSeeking`, `volume`, `isMuted`, `error` — local state

## Active Files

- `src/renderer/components/VideoPlayer/VideoPlayer.jsx`
- `src/renderer/store/playbackStore.js`
- `src/renderer/hooks/useImport.js`
- `src/renderer/components/MediaLibrary/MediaLibrary.jsx`
- `CONTEXT.md` — full bug investigation history
