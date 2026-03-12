# Active Context: ClipForge

## Current Work Focus

**Phase**: VideoPlayer seek bug investigation
**Date**: March 11, 2026
**Status**: Bug unresolved — architecture cleaned up significantly, root cause identified as likely Electron custom protocol issue

## The Active Bug

On first import only, arrow key seeks and slider scrubbing fail silently — `video.currentTime = time` is called with correct values but the video does not move. Play/pause works. Second import works. Timeline clip playback works.

Full investigation history: see `CONTEXT.md` in project root.

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

## Immediate Next Steps

Investigate the seek bug. Leading hypothesis: `local-video://` custom protocol does not support HTTP byte-range requests, which Chromium requires for seeking in large video files. See `CONTEXT.md` for full list of next approaches.

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
