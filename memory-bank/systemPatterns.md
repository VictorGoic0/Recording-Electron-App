# System Patterns: ClipCreate

## Architecture Overview

ClipCreate uses **Electron** for cross-platform desktop deployment with a clear separation:

```
┌─────────────────────────────────────────────┐
│         Renderer Process (React)            │
│  - UI Components                            │
│  - State Management (Context)               │
│  - MediaRecorder Recording                  │
│  - Video Preview                            │
└──────────────┬──────────────────────────────┘
               │ IPC Communication
┌──────────────┴──────────────────────────────┐
│         Main Process (Node.js)              │
│  - FFmpeg Integration                       │
│  - File System Operations                   │
│  - Export Processing                        │
│  - Metadata Extraction                      │
└─────────────────────────────────────────────┘
```

## Key Patterns

### 1. Context-Based State Management

#### MediaContext

- **Purpose**: Global media library state
- **Responsibilities**:
  - Manage `clips` array
  - Add/remove/update clips
  - Provide clip metadata
- **Pattern**: Provider wraps entire app

#### TimelineContext

- **Purpose**: Timeline editing state
- **Responsibilities**:
  - Manage `tracks` array (3 tracks: main, overlay, overlay2)
  - Track `playhead` position (0-1 normalized)
  - Handle `zoom` level (1x-10x)
  - Manage clip positioning and trimming
  - Split clips at playhead
- **Pattern**: Provider wraps entire app

```javascript
// Track structure
{
  id: "main" | "overlay" | "overlay2",
  name: string,
  clips: [
    {
      id: string,
      mediaId: string,
      filePath: string,
      filename: string,
      duration: number,
      position: number,      // Start time on timeline
      trimStart: number,     // Trim from video start
      trimEnd: number,       // Trim from video end
      track: string         // Track ID
    }
  ]
}
```

### 2. Recording Architecture

#### Custom Hooks Pattern

**useScreenRecording**

- Encapsulates all screen recording logic
- Manages MediaRecorder lifecycle
- Handles audio stream mixing
- Returns clean interface: `{ isRecording, isPaused, recordingTime, startRecording, stopRecording, togglePause }`

**useWebcamRecording**

- Parallel structure to screen recording
- Camera-specific configuration (resolution, frame rate)
- Error handling for 6 getUserMedia error types
- Returns identical interface for UI consistency

#### Recording Flow

```
User Action
    ↓
Source Selection (Screen Picker / Camera Picker)
    ↓
Start Recording (MediaRecorder VP9/VP8)
    ↓
Controls (Start/Stop/Pause/Resume)
    ↓
Save to File (Videos folder)
    ↓
FFmpeg Post-Processing (fix WebM duration)
    ↓
Auto-Import to Media Library
```

#### Shared Recording UI

- Both screen and webcam share same control buttons
- Consistent timer display format
- Unified error handling and toast notifications

### 3. Multi-Track Timeline

#### Track Types

- **Main Track**: Full-screen video layer (base)
- **Overlay Track**: Picture-in-picture (bottom-right, 25% width)
- **Overlay Track 2**: Picture-in-picture (bottom-left, 25% width)

#### Drag & Drop Behavior

- Source: `MediaLibrary` items
- Target: Track containers in `Timeline`
- Visual feedback: Track labels highlight, borders pulse
- Result: Clip added to target track at end position

#### Multi-Track Preview

- Renders multiple `<video>` elements
- Main video: standard player
- Overlay videos: absolute positioned over main
- Synchronized playback via useEffect (100ms interval)

#### Multi-Track Export

- Auto-detects if multiple tracks have clips
- Uses FFmpeg overlay filter chains
- Scales overlays: `scale=iw*0.25:-1`
- Positions overlays:
  - Overlay 1: `main_w-overlay_w-20:main_h-overlay_h-80`
  - Overlay 2: `20:main_h-overlay_h-80`

### 4. FFmpeg Integration

#### Unidirectional IPC Pattern

```javascript
// Renderer → Main (Commands)
window.api.send("extract-metadata", filePath);
window.api.send("export-timeline", exportData);
window.api.send("post-process-recording", { inputPath, outputPath });

// Main → Renderer (Events)
window.api.receive("metadata-result", (data) => {});
window.api.receive("export-progress", (progress) => {});
window.api.receive("export-complete", (result) => {});
```

**Why this pattern?**

- Clean separation of concerns
- Event-driven progress updates
- Non-blocking operations
- Error isolation

#### FFmpeg Operations

**1. Metadata Extraction**

```javascript
ffprobe -v error -show_entries format=duration:stream=width,height -of json
```

- Extract video metadata on import
- Store in MediaContext

**2. Export Single Clip**

```javascript
ffmpeg -ss [trimStart] -i [input] -t [duration] -c:v libx264 -c:a aac
```

- Trim and encode to MP4
- H.264 video, AAC audio

**3. Export Multi-Clip Timeline**

```javascript
// Create temp segments
ffmpeg -ss [trimStart] -i [input] -t [duration] -c copy

// Concatenate via demuxer
ffmpeg -f concat -safe 0 -i concat.txt -c:v libx264 -c:a aac
```

- Lossless segment creation
- Efficient concatenation

**4. Export Multi-Track**

```javascript
ffmpeg -i main.mp4 -i overlay1.mp4 -i overlay2.mp4 \
  -filter_complex "[1]scale=iw*0.25:-1[ov1]; \
                   [2]scale=iw*0.25:-1[ov2]; \
                   [0][ov1]overlay=main_w-overlay_w-20:main_h-overlay_h-80[tmp]; \
                   [tmp][ov2]overlay=20:main_h-overlay_h-80" \
  -c:v libx264 -c:a aac output.mp4
```

- Complex filter chains for overlays
- Precise positioning and scaling

**5. WebM Duration Fix**

```javascript
ffmpeg -i [input.webm] -c copy [output.webm]
```

- Remuxes WebM to fix duration metadata
- Critical for MediaRecorder output

### 5. Video Player Synchronization

#### Playhead Binding

```javascript
useEffect(() => {
  if (!videoRef.current) return;
  videoRef.current.currentTime = playhead * duration;
}, [playhead]);
```

#### Timeline Scrubbing

```javascript
const handleTimelineClick = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const newPlayhead = clickX / rect.width;
  setPlayhead(newPlayhead);
};
```

#### Multi-Track Sync

```javascript
// Sync play/pause state
useEffect(() => {
  overlayVideoRefs.current.forEach((ref) => {
    if (ref) {
      if (isPlaying) ref.play();
      else ref.pause();
    }
  });
}, [isPlaying]);

// Sync current time (100ms interval)
useEffect(() => {
  if (!isPlaying) return;
  const interval = setInterval(() => {
    overlayVideoRefs.current.forEach((ref) => {
      if (ref) ref.currentTime = videoRef.current.currentTime;
    });
  }, 100);
  return () => clearInterval(interval);
}, [isPlaying]);
```

### 6. Timeline Calculations

#### Time Conversions

```javascript
// Playhead (0-1) → Timeline seconds
const timelineTime = playhead * maxTimelineDuration;

// Pixel position → Time
const time = (pixelX / containerWidth) * maxTimelineDuration;

// Clip position → Pixels
const pixelX = (clipPosition / maxTimelineDuration) * containerWidth;
```

#### Zoom Behavior

```javascript
const pixelsPerSecond = (containerWidth * zoom) / maxTimelineDuration;
```

- 1x = entire timeline visible
- 10x = zoomed in (scrollable)

### 7. Trim Operations

#### Clip Structure

```javascript
{
  position: 5.0,      // Start at 5s on timeline
  duration: 10.0,     // Original video is 10s
  trimStart: 2.0,     // Skip first 2s
  trimEnd: 8.0,       // End at 8s
}
```

**Effective duration**: `trimEnd - trimStart = 6s`
**Timeline span**: 5s to 11s

#### Trim Handle Interaction

```javascript
const handleLeftTrimDrag = (deltaPixels) => {
  const deltaSeconds = deltaPixels / pixelsPerSecond;
  const newTrimStart = Math.max(0, trimStart + deltaSeconds);
  updateClipTrim(clipId, { trimStart: newTrimStart });
};
```

### 8. Split Clip Logic

#### Split Function Pattern

```javascript
splitClipAtPlayhead(clipId, trackId, splitTime) {
  // 1. Find original clip
  // 2. Calculate split offset relative to trim bounds
  // 3. Create two new clips:
  //    - Clip 1: position=original, trimEnd=splitOffset
  //    - Clip 2: position=splitTime, trimStart=splitOffset
  // 4. Replace original with both clips atomically
}
```

#### Split Validation

- Playhead must be within clip bounds (not at edges)
- Respects existing trim settings
- Preserves all metadata (filePath, filename, duration)
- Generates new unique IDs for both clips

### 9. Component Communication

#### MediaLibrary → Timeline

```javascript
// Drag & Drop
onDragStart={(e) => {
  e.dataTransfer.setData('mediaId', clip.id);
  e.dataTransfer.setData('filePath', clip.path);
}}

onDrop={(e) => {
  const mediaId = e.dataTransfer.getData('mediaId');
  addClipToTimeline(mediaId, trackId);
}}
```

#### Timeline ↔ VideoPlayer

```javascript
// Timeline controls playhead
<Timeline playhead={playhead} setPlayhead={setPlayhead} />;

// VideoPlayer updates playhead during playback
useEffect(() => {
  const handleTimeUpdate = () => {
    setPlayhead(videoRef.current.currentTime / duration);
  };
  videoRef.current.addEventListener("timeupdate", handleTimeUpdate);
}, []);
```

### 10. Error Handling

#### Toast Notifications

```javascript
const showToast = (message, type = "info") => {
  // Create toast element
  // Auto-remove after 3s
  // User can dismiss early
};
```

#### Error Types

- **Permission Denied**: `NotAllowedError` → "Camera/screen access denied"
- **Device Not Found**: `NotFoundError` → "No camera/screen found"
- **Device In Use**: `NotReadableError` → "Camera/screen already in use"
- **Invalid Settings**: `OverconstrainedError` → "Settings not supported"
- **User Cancelled**: `AbortError` → "Selection cancelled"
- **Generic**: Fallback message

## File Organization

```
src/
├── main/                   # Main Process
│   ├── main.js            # IPC handlers, window management
│   └── services/
│       ├── ffmpegService.js      # FFmpeg wrapper
│       ├── exportService.js      # Export logic (single + multi-track)
│       └── metadataService.js    # Metadata extraction
│
└── renderer/              # Renderer Process
    ├── App.jsx           # Root component
    ├── index.jsx         # React DOM entry
    ├── context/
    │   ├── MediaContext.jsx      # Media library state
    │   └── TimelineContext.jsx   # Timeline editing state
    ├── components/
    │   ├── MediaLibrary.jsx      # Clip grid + recording UI
    │   ├── VideoPlayer.jsx       # Preview + multi-track rendering
    │   ├── Timeline.jsx          # Timeline tracks + controls
    │   ├── ScreenPicker.jsx      # Screen source selection
    │   └── CameraPicker.jsx      # Camera source selection
    └── hooks/
        ├── useScreenRecording.js   # Screen recording logic
        └── useWebcamRecording.js   # Webcam recording logic
```

## Design Principles

1. **Separation of Concerns**: Renderer handles UI, Main handles FFmpeg
2. **Context for Global State**: Avoid prop drilling
3. **Custom Hooks**: Encapsulate complex logic
4. **Unidirectional Data Flow**: Context provides state + actions
5. **Event-Driven IPC**: Non-blocking operations
6. **Atomic State Updates**: Batch changes in setState
7. **Error Isolation**: Try-catch at boundaries, user-friendly messages
8. **Consistent Patterns**: Screen/Webcam recording use same structure
