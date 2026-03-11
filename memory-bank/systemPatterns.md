# System Patterns: ClipForge

## Architecture Overview

ClipForge uses **Electron** for cross-platform desktop deployment with a clear separation:

```
┌─────────────────────────────────────────────┐
│         Renderer Process (React)            │
│  - UI Components                            │
│  - State Management (Zustand)               │
│  - MediaRecorder Recording                  │
│  - Video Preview                            │
└──────────────┬──────────────────────────────┘
               │ IPC Communication (preload bridge)
┌──────────────┴──────────────────────────────┐
│         Main Process (Node.js)              │
│  - FFmpeg Integration                       │
│  - File System Operations                   │
│  - Export Processing                        │
│  - CSP Headers (webRequest)                 │
└─────────────────────────────────────────────┘
```

## Key Patterns

### 1. Zustand Store Architecture

State is split into two stores. No React Context providers anywhere.

#### `useMediaStore` (`src/renderer/store/mediaStore.js`)

- **Purpose**: Media library — what files exist in the project
- **State**: `clips[]`, `selectedClipId`
- **Actions**: `addMedia`, `addMultipleMedia`, `removeMedia`, `updateMedia`, `clearAllMedia`, `selectClip`
- **Computed** (derive at call site): `selectedClip = clips.find(c => c.id === selectedClipId)`

#### `usePlaybackStore` (`src/renderer/store/playbackStore.js`)

- **Purpose**: Playback session — timeline structure, video position, playback controls
- **State**: `playhead` (seconds), `duration`, `zoom`, `tracks[]`, `selectedTimelineClipId`
- **Phase 2 additions**: `currentTime`, `isPlaying`, `isSeeking`
- **Actions**: `setPlayhead`, `setDuration`, `setZoom`, `selectTimelineClip`, `addClipToTimeline`, `removeClipFromTimeline`, `updateClipPosition`, `updateClipTrim`, `splitClipAtPlayhead`, `moveClipToTrack`
- **Computed** (derive at call site): `selectedTimelineClip = tracks.flatMap(t => t.clips).find(c => c.id === selectedTimelineClipId)`

#### Critical design rule: Playhead = Absolute Seconds

`playhead` is stored and communicated as **absolute seconds**, never as a normalized [0, 1] fraction.

```
// Rendering playhead line position in Timeline:
left: `${(playhead / maxTimelineDuration) * 100}%`   // ✅ correct

// NOT:
left: `${playhead * 100}%`                            // ❌ old pattern — deleted
```

Rationale: The old normalized playhead required multiplying by `duration` in consumers. Since `duration` was stored separately in both VideoPlayer local state and TimelineContext, the two could diverge, causing the red line and video to point to different positions.

#### `setCurrentTime` is Atomic (Phase 2)

```javascript
setCurrentTime: (seconds) => set({ currentTime: seconds, playhead: seconds })
```

A single store write keeps `currentTime` and `playhead` permanently in sync. No callback chain, no render-cycle lag.

---

### 2. Track Structure

```javascript
// Track
{ id: "main" | "overlay" | "overlay2", name: string, clips: [] }

// Timeline clip
{
  id: string,          // Unique ID on timeline (not same as library clip ID)
  fileId: string,      // Reference to library clip
  filePath: string,
  filename: string,
  duration: number,    // Source video duration
  position: number,    // Start time on timeline (seconds)
  trimStart: number,   // Trim from video start (seconds)
  trimEnd: number,     // Trim from video end (seconds)
  track: string        // Track ID
}
```

---

### 3. Recording Architecture

#### Custom Hooks Pattern

**useScreenRecording** / **useWebcamRecording**
- Encapsulate all recording logic (MediaRecorder lifecycle, audio mixing, error handling)
- Return clean interface: `{ isRecording, isPaused, recordingTime, startRecording, stopRecording, togglePause }`
- Recording flow: Source Selection → Start (VP9/VP8) → Controls → Save → FFmpeg post-process → Auto-import

---

### 4. FFmpeg Integration

#### IPC Pattern (via preload bridge `window.electron`)

```javascript
// Commands (renderer → main)
window.electron.fileSystem.processVideoFile(filePath)
window.electron.export.exportTimeline(exportData)

// Events (main → renderer)
window.electron.export.onProgress((progress) => {})
```

#### Key Operations

| Operation | FFmpeg command pattern |
|---|---|
| Metadata | `ffprobe -v error -show_entries format=duration:stream=width,height` |
| Single clip export | `ffmpeg -ss [trimStart] -i [input] -t [duration] -c:v libx264 -c:a aac` |
| Multi-clip concat | `ffmpeg -f concat -safe 0 -i concat.txt -c:v libx264 -c:a aac` |
| Multi-track overlay | `ffmpeg -filter_complex "[1]scale=iw*0.25:-1[ov1];[0][ov1]overlay=x:y"` |
| WebM duration fix | `ffmpeg -i input.webm -c copy output.webm` |

---

### 5. Video Player Synchronization (Phase 1 state — Phase 2 will simplify)

#### Current bridge (temporary, Phase 2 removes it)

```javascript
// App.jsx passes absolute seconds to VideoPlayer
<VideoPlayer
  onShowToast={showToast}
  onCurrentTimeChange={setPlayhead}   // receives seconds, writes to store
  timelinePlayhead={playhead}          // absolute seconds from store
/>

// VideoPlayer seeks when store playhead changes
useEffect(() => {
  if (videoRef.current && isFinite(timelinePlayhead)) {
    if (Math.abs(videoRef.current.currentTime - timelinePlayhead) > 0.1) {
      videoRef.current.currentTime = timelinePlayhead; // direct seek, no conversion
    }
  }
}, [timelinePlayhead, selectedClip]);
```

#### Phase 2 target (no props, no bridge)

```javascript
// VideoPlayer reads/writes store directly
const playhead = usePlaybackStore(s => s.playhead);
const setCurrentTime = usePlaybackStore(s => s.setCurrentTime); // atomic

// onTimeUpdate
setCurrentTime(videoRef.current.currentTime); // writes currentTime + playhead atomically

// Seek from external playhead change
useEffect(() => {
  if (!seekingFromStoreRef.current) {
    videoRef.current.currentTime = playhead;
  }
}, [playhead]);
```

---

### 6. Timeline Calculations

```javascript
// Playhead line position (absolute seconds → percentage)
const left = (playhead / maxTimelineDuration) * 100;

// Pixel click → absolute seconds (no normalization step)
const time = (relativeX / containerWidth) * maxTimelineDuration;
setPlayhead(time); // store receives seconds directly

// Clip position → pixels
const pixelX = (clip.position / maxTimelineDuration) * containerWidth * zoom;
```

---

### 7. Trim Operations

```javascript
// Clip trim structure
{
  position: 5.0,    // Start at 5s on timeline
  duration: 10.0,   // Original video is 10s
  trimStart: 2.0,   // Skip first 2s of source
  trimEnd: 8.0,     // End at 8s of source
}
// Effective duration = trimEnd - trimStart = 6s
// Timeline span = 5s to 11s
```

---

### 8. Split Clip Logic

```javascript
// splitTime is absolute seconds (playhead value directly)
splitClipAtPlayhead(clipId, trackId, splitTime) {
  const splitOffset = trimStart + (splitTime - clipStartTime);
  clip1 = { ...original, trimEnd: splitOffset };
  clip2 = { ...original, position: splitTime, trimStart: splitOffset };
  // Replace original with both clips atomically in store
}
```

---

### 9. Content Security Policy

Set in main process via `session.defaultSession.webRequest.onHeadersReceived`:

```javascript
// Dev: allows Vite HMR
"script-src 'self' 'unsafe-inline' http://localhost:3000"

// Production: strict
"script-src 'self'"
// Both: allow blob: and local-video: for media
"media-src 'self' blob: local-video:"
```

---

### 10. Design Principles

1. **Single source of truth**: Each piece of state lives in exactly one place (store)
2. **Absolute time values**: No normalized fractions for playhead — prevents duration split-brain
3. **Atomic writes**: `setCurrentTime` writes both `currentTime` and `playhead` together
4. **Separation of concerns**: Renderer handles UI + state, Main handles FFmpeg + file system
5. **Derive, don't store**: Computed values (`selectedClip`, `selectedTimelineClip`) derived at call site
6. **UI-local stays local**: Toasts, modals, volume, error messages never enter global store
7. **Custom hooks for complexity**: Recording logic encapsulated in `useScreenRecording`/`useWebcamRecording`
8. **Event-driven IPC**: Non-blocking operations with progress callbacks
