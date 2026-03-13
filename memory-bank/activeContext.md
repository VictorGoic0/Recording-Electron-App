# Active Context: ClipForge

## Current Work Focus

**Phase**: Complete — all known bugs fixed, recording preview added
**Date**: March 12, 2026
**Status**: All bugs resolved. Recording preview live for both webcam and screen.

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

### Playhead Sync (shipped)
- `pendingSeek` field added to `usePlaybackStore` — set by `setPlayhead` (Timeline drag), cleared by VideoPlayer after applying
- `setPlayheadFromVideo(seconds)` — sets `playhead` only, no `pendingSeek`, no loop
- VideoPlayer `timeupdate` writes to store via RAF throttle (one write per animation frame)
- VideoPlayer `useEffect([pendingSeek])` applies `video.currentTime = pendingSeek` then clears
- Timeline needle now tracks video playback in real time; Timeline drag seeks video

### Selection Mutual Exclusivity (shipped)
- `selectedClipId` → `selectedMediaLibraryClipId` in `mediaStore`
- `selectClip` → `selectMediaLibraryClip` in `mediaStore`
- `selectMediaLibraryClip(clipId)` calls `selectTimelineClip(null)` when `clipId !== null`
- `selectTimelineClip(clipId)` calls `selectMediaLibraryClip(null)` when `clipId !== null`
- Null-guard on both sides prevents circular calls
- Selecting a library clip now always clears timeline selection and vice versa

### Recording Preview (shipped)
- `previewStream` (unified state, was `webcamPreviewStream`) + `previewVideoRef` used for both webcam and screen
- Screen source selection now acquires a live `getUserMedia` stream immediately via `handleScreenSourceSelect` — matches webcam behavior
- Both hooks (`useScreenRecording`, `useWebcamRecording`) gained `startRecordingFromStream(existingStream)` — records from the already-live preview stream without acquiring a new one, so preview is uninterrupted during recording
- `streamIsExternalRef` flag in both hooks prevents `stopRecording` from killing the preview stream (caller owns lifecycle)
- `stopPreviewStream()` helper centralizes teardown; called on cancel and after save
- JSX: preview renders for both source types, visible before and during recording; `● REC` badge overlaid during active recording
- Camera settings panel still hides during recording (changing resolution mid-stream is a no-op)
- CSS: `webcam-preview-container/webcam-preview` → `recording-preview-container/recording-preview`; added `.preview-recording-badge`

## Immediate Next Steps

TBD — session complete.

## Active Architecture

```
useMediaStore                    usePlaybackStore
─────────────                    ────────────────
clips                            playhead (absolute seconds)
selectedMediaLibraryClipId       pendingSeek (null | seconds)
                                 duration
                                 isPlaying
                                 tracks
                                 zoom
                                 selectedTimelineClipId
```

### Store actions — cross-store mutual exclusivity
- `selectMediaLibraryClip(id)` → clears `selectedTimelineClipId` (if id !== null)
- `selectTimelineClip(id)` → clears `selectedMediaLibraryClipId` (if id !== null)

### VideoPlayer local state
- `readOnlyCurrentTime` — drives time display and progress bar only
- `isPlaying` — from store (also consumed by Timeline)
- `duration` — from store (also consumed by Timeline/export)
- `isSeeking`, `volume`, `isMuted`, `error` — local state

## Active Files

- `src/renderer/components/VideoPlayer/VideoPlayer.jsx`
- `src/renderer/store/playbackStore.js`
- `src/renderer/store/mediaStore.js`
- `src/renderer/hooks/useImport.js`
- `src/renderer/hooks/useScreenRecording.js`
- `src/renderer/hooks/useWebcamRecording.js`
- `src/renderer/components/MediaLibrary/MediaLibrary.jsx`
- `src/renderer/components/MediaLibrary/MediaLibrary.css`
- `src/main/main.js` — `local-video://` protocol handler
