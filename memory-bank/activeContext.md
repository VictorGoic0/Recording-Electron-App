# Active Context: ClipForge

## Current Work Focus

**Phase**: Zustand Refactor — Complete
**Date**: March 11, 2026
**Status**: Both PR #1 and PR #2 shipped and verified

## What Was Just Completed

The full two-phase Zustand state refactor is done. All three reported playback bugs are confirmed fixed.

**Phase 1 (PR #1) — Context → Zustand:**
- Installed `zustand@^5.0.11`
- Created `useMediaStore` and `usePlaybackStore`
- Deleted `MediaContext.jsx` and `TimelineContext.jsx`
- Migrated all consumers; `playhead` normalized to absolute seconds throughout

**Phase 2 (PR #2) — VideoPlayer state → Zustand:**
- `currentTime`, `duration`, `isPlaying`, `isSeeking` moved from VideoPlayer local state into `usePlaybackStore`
- `setCurrentTime(seconds)` is atomic — writes both `currentTime` and `playhead` in one update
- `seekingFromVideoRef` ref flag prevents feedback loop between video element and store
- `onCurrentTimeChange` / `timelinePlayhead` prop bridge removed entirely
- `App.jsx` no longer imports or uses `usePlaybackStore` — all playback concerns are self-contained in VideoPlayer and Timeline

## Bug Fix Status

| Bug | Root Cause | Status |
|---|---|---|
| Keyboard seek unresponsive on first load | Stale closure over `duration = 0` in handlers | ✅ Fixed — handlers read `videoRef.current` directly |
| Red line out of sync with video | Split `duration` state causing divergent playhead math | ✅ Fixed — single `duration`, absolute-seconds playhead |
| Split at wrong position | Callback-lag race via `onCurrentTimeChange` chain | ✅ Fixed — `setCurrentTime` is atomic, no lag |

## Immediate Next Steps

- Resume **PR #10**: Polish & Packaging
  - Final UI polish
  - Build distributable (.exe)
  - Demo video creation
- Address remaining specific bugs as separate issues

## Active Architecture

```
useMediaStore          usePlaybackStore
─────────────          ────────────────
clips                  playhead (absolute seconds)
selectedClipId         duration
                       currentTime       ← atomic with playhead
                       isPlaying
                       isSeeking
                       tracks
                       zoom
                       selectedTimelineClipId
```

- `setCurrentTime(s)` → `{ currentTime: s, playhead: s }` (single write)
- UI-local state stays local: `volume`, `isMuted`, `error` (VideoPlayer), `toasts`, modals, `isProcessing` (App)
- No React Context providers anywhere in the tree

## Active Files

- `src/renderer/store/mediaStore.js`
- `src/renderer/store/playbackStore.js`
- `src/renderer/components/VideoPlayer/VideoPlayer.jsx`
- `src/renderer/components/Timeline/Timeline.jsx`
- `src/renderer/App.jsx`
