# ClipForge - Product Requirements Document

## Project Overview

**Project Name:** ClipForge  
**Timeline:** 72 hours (October 27-29, 2025)  
**Tech Stack:** Electron + React + Bundled FFmpeg  
**Platform:** Desktop (macOS + Windows)  
**Purpose:** Portfolio project / Assignment submission

ClipForge is a desktop video editor that enables users to record their screen and webcam, import video clips, arrange them on a timeline, and export professional-looking videos. Built as a 72-hour sprint project, it focuses on core video editing workflows without cloud dependencies.

---

## Key Deadlines

| Milestone            | Deadline                           | Requirements                                      |
| -------------------- | ---------------------------------- | ------------------------------------------------- |
| **MVP Checkpoint**   | Tuesday, October 28, 10:59 PM CT   | Core import, timeline, trim, export functionality |
| **Final Submission** | Wednesday, October 29, 10:59 PM CT | Full feature set with recording capabilities      |

---

## Technical Architecture

### Core Stack

- **Desktop Framework:** Electron
- **Frontend:** React
- **Media Processing:** Bundled FFmpeg binary + fluent-ffmpeg
- **Timeline UI:** HTML5 Canvas or DOM-based with draggable components
- **Video Player:** HTML5 `<video>` element
- **Storage:** Local filesystem (no backend/database)

### Why This Stack?

- **Electron:** Mature ecosystem, excellent React integration, comprehensive native APIs
- **Bundled FFmpeg:** Native performance (5-10x faster than WASM), full codec support, handles large files
- **No Backend:** All operations local - no authentication, no cloud sync, no database
- **File-based Projects:** Save timeline state as JSON with file path references

### Architecture Considerations

- FFmpeg binary management per platform (macOS/Windows paths)
- MediaRecorder API for screen/webcam capture
- Electron's desktopCapturer for screen source selection
- IPC communication between main and renderer processes
- File system access for import/export operations

---

## MVP Requirements (Tuesday 10:59 PM CT)

**Hard gate - must have all of these:**

### 1. Desktop Application Launch

- Electron app that builds and runs
- Basic window management (minimize, maximize, close)
- Application menu structure

### 2. Video Import

- Drag and drop support for video files
- File picker dialog (open file browser)
- Supported formats: MP4, MOV, WebM
- Visual confirmation of successful import

### 3. Timeline View

- Visual representation of imported clips
- Playhead indicator (current time position)
- Time ruler showing duration
- Display clip thumbnails or names on timeline

### 4. Video Preview Player

- Play imported clips in preview window
- Show current frame at playhead position
- Basic play/pause controls
- Audio synchronized with video

### 5. Basic Trim Functionality

- Set in-point (start) on a single clip
- Set out-point (end) on a single clip
- Visual feedback of trim boundaries
- Preview trimmed clip before export

### 6. Export to MP4

- Export single clip or timeline to MP4 format
- Use bundled FFmpeg for encoding
- Save file to user-selected location
- Basic progress indicator

### 7. Native App Package

- Built distributable (not just dev mode)
- Can be installed and launched like normal desktop app
- Tested on at least one platform (Mac or Windows)

**MVP Success Criteria:** Can import a video, place it on timeline, trim it, and export it as MP4.

---

## Core Features (Wednesday Final Submission)

### Recording Capabilities

#### Screen Recording

- **Source Selection:** Full screen or specific window
- **Controls:**
  - Start recording button
  - Stop recording button
  - Pause/Resume during recording
  - 3-2-1 countdown before recording starts
- **Audio:** Capture system audio (optional) + microphone
- **Output:** Automatically add recorded clip to media library
- **Technical Implementation:**
  - Use Electron's `desktopCapturer` API to enumerate screens/windows
  - Pass selected source to `MediaRecorder` API
  - Handle multiple display scenarios

#### Webcam Recording

- **Source Selection:** List available cameras, let user choose
- **Controls:** Same as screen recording (start/stop/pause/countdown)
- **Audio:** Capture from microphone
- **Output:** Save to media library as separate clip
- **Technical Implementation:**
  - Use `navigator.mediaDevices.getUserMedia()` for camera access
  - Handle camera permissions

#### Simultaneous Recording (Stretch Goal)

- **Real-time Picture-in-Picture:** Overlay webcam on screen recording during capture
- **Single Output File:** One combined video file
- **Webcam Controls:** Position, size, border styling during recording
- **MVP Approach (Option B):** Record screen and webcam separately, user overlays in timeline
  - Simpler implementation (two independent recordings)
  - More flexible editing (reposition webcam in post)
  - Reuses multi-track timeline functionality

#### Recording UI/UX

- Pre-recording preview (show what will be captured)
- Recording indicator (red dot, timer showing duration)
- Audio level meters during recording
- Option to select microphone source
- Save recorded files with timestamps as filenames

### Import & Media Management

#### Import Methods

- **Drag and Drop:** Drag video files directly onto app window
- **File Picker:** Traditional "Open File" dialog
- **Supported Formats:** MP4, MOV, WebM only

#### Media Library Panel

- Grid or list view of imported clips
- Thumbnail preview for each clip (first frame or middle frame)
- Display metadata:
  - Filename
  - Duration (MM:SS format)
  - Resolution (e.g., "1920x1080")
  - File size (MB)
- Right-click context menu: Remove from library, reveal in Finder/Explorer
- Search/filter imported clips (stretch goal)

#### Error Handling

- **Unsupported Format:** "Unsupported format. Please use MP4, MOV, or WebM"
- **Large Files:** "This file is very large (XGB). Processing may take time."
- **Corrupted Files:** "This file appears corrupted or cannot be read"
- **Missing Codecs:** "This video codec is not supported"

### Timeline Editor

**The core of the application.**

#### Visual Layout

- Horizontal timeline with time ruler (showing seconds/minutes)
- Playhead (vertical line) indicating current time position
- **Track System:**
  - Track 1: Main video track
  - Track 2: Overlay/Picture-in-Picture track
  - Track 3: Optional additional overlay
  - _Unlimited tracks = stretch goal_

#### Clip Operations

- **Add to Timeline:** Drag clips from media library to timeline
- **Arrange Clips:** Drag clips horizontally to reorder in sequence
- **Trim Clips:**
  - Drag clip edges to adjust start/end points
  - Visual trim handles on clip edges
  - Show trimmed duration while dragging
- **Split Clips:**
  - Position playhead where you want to split
  - Split button or keyboard shortcut (Cmd/Ctrl+K)
  - Creates two separate clips at playhead position
- **Delete Clips:**
  - Select clip and press Delete/Backspace
  - Or right-click → Delete
  - Confirmation dialog (optional)

#### Multi-Track Support

- **Layer Behavior:** Upper tracks overlay lower tracks
- **Use Cases:**
  - Track 1: Screen recording
  - Track 2: Webcam overlay (smaller, positioned in corner)
- **Track Controls:**
  - Mute/unmute individual tracks (audio)
  - Lock track to prevent accidental edits (stretch goal)

#### Timeline Navigation

- **Zoom In/Out:**
  - Zoom controls or pinch gesture
  - Show more/less detail in timeline
  - Useful for precise trimming
- **Scroll/Pan:** Scroll horizontally through long timelines
- **Snap Behavior:**
  - Snap to clip edges when dragging
  - Snap to playhead when positioning clips
  - Toggle snap on/off (stretch goal)
- **Playhead Movement:**
  - Click anywhere on timeline to jump playhead
  - Drag playhead to scrub through video

#### Timeline UI/UX Details

- Clip thumbnails or colored blocks on timeline
- Clip names overlaid on timeline clips
- Transition indicators between clips (if transitions added)
- Visual feedback when dragging (highlight drop zones)
- Ripple delete option: closing gaps when deleting clips (stretch goal)

### Preview & Playback

#### Preview Window

- Real-time preview of timeline composition
- Shows combined output of all tracks at playhead position
- Matches final export appearance
- Adjustable preview quality (lower quality for performance)

#### Playback Controls

- **Play/Pause Button:** Standard spacebar toggle
- **Stop Button:** Return playhead to beginning
- **Skip Forward/Back:** Jump 5-10 seconds (arrow keys)
- **Speed Control:** 0.5x, 1x, 2x playback speed (stretch goal)

#### Scrubbing

- Click and drag playhead to any position
- Preview updates in real-time as you scrub
- Smooth scrubbing performance (no lag)

#### Audio Playback

- Audio synchronized with video during preview
- Mute button for preview audio
- Volume slider (stretch goal)

#### Performance Targets

- Preview plays at 30fps minimum
- Scrubbing remains responsive with 10+ clips
- No dropped frames during playback

### Export & Output

#### Export Settings

- **Format:** MP4 (H.264 video codec, AAC audio codec)
- **Resolution Options:**
  - 720p (1280x720)
  - 1080p (1920x1080)
  - Source resolution (auto-detect if source is 1080p)
  - _Additional resolutions (4K, custom) = stretch goal_
- **Quality Preset:**
  - Standard quality (default, balanced)
  - High quality (larger file size) - stretch goal
  - Lower quality (smaller file size) - stretch goal

#### Export Process

- **File Destination:** User selects save location via file picker
- **Progress Indicator:**
  - Progress bar (percentage)
  - Estimated time remaining
  - Current processing step (e.g., "Encoding video...")
  - Cancel button to abort export
- **Processing:**
  - Use bundled FFmpeg with fluent-ffmpeg
  - Stitch all timeline clips in sequence
  - Apply trim points and track overlays
  - Encode to final MP4 file
- **Completion:**
  - Success notification
  - "Reveal in Finder/Explorer" button
  - Option to export another copy at different resolution

#### Error Handling

- **Insufficient Disk Space:** "Not enough disk space. Need XGB free."
- **Export Failed:** "Export failed. Check disk space and try again."
- **Missing Source Files:** "Cannot export: source file 'video.mp4' not found."
- **Corrupted Output:** Validate exported file before showing success

#### Performance Targets

- Export completes without crashes
- Export time reasonable: ~1-2 minutes for 2-minute video at 1080p
- No memory leaks during long exports

---

## Stretch Goals (Post-MVP)

Prioritized features to add if core functionality is complete early:

### High Priority

1. **Save/Load Projects**

   - Save timeline state as JSON file
   - Format: Store clip paths, trim points, track positions
   - File extension: `.clipforge` or `.json`
   - Load existing projects back into editor
   - _Note: Projects break if source video files are moved/deleted (acceptable)_

2. **Undo/Redo**

   - Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
   - Unlimited undo history (or last 50 actions)
   - Apply to all timeline operations

3. **Keyboard Shortcuts**

   - Play/Pause: Spacebar
   - Split: Cmd/Ctrl+K
   - Delete: Delete/Backspace
   - Undo/Redo: Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z
   - Export: Cmd/Ctrl+E
   - Save Project: Cmd/Ctrl+S
   - Import: Cmd/Ctrl+I

4. **Real-time PiP Recording (Option A)**
   - Overlay webcam on screen during recording
   - Single combined output file
   - Webcam position/size controls during recording

### Medium Priority

5. **Transitions Between Clips**

   - Fade in/out
   - Cross-dissolve
   - Slide transitions
   - Apply between any two clips on timeline

6. **Text Overlays**

   - Add text layers on timeline
   - Custom fonts and sizes
   - Position text anywhere on video
   - Basic animations (fade in, slide in)

7. **Audio Controls**

   - Volume adjustment per clip
   - Fade in/out on audio
   - Normalize audio levels
   - Import separate audio files (MP3, WAV)

8. **Unlimited Timeline Tracks**
   - Add/remove tracks dynamically
   - No fixed limit on overlays

### Lower Priority

9. **Filters and Effects**

   - Brightness, contrast, saturation adjustments
   - Color correction
   - Blur, sharpen

10. **Export Presets**

    - YouTube (1080p, 16:9)
    - Instagram (1080x1080, square)
    - TikTok (1080x1920, vertical)
    - Twitter (720p, optimized size)

11. **Auto-save**

    - Periodically save project state
    - Recover from crashes

12. **Advanced Export Options**
    - Custom resolution input
    - Frame rate options (24fps, 30fps, 60fps)
    - Bitrate control
    - Multiple format support (WebM, MOV)

---

## Testing Scenarios

The application will be tested with these workflows:

### Scenario 1: Basic Import and Export

1. Launch app
2. Import 1 video clip via drag-and-drop
3. Verify clip appears in media library with correct metadata
4. Drag clip to timeline
5. Export to MP4 at 1080p
6. Verify exported file plays correctly

### Scenario 2: Screen Recording

1. Click "Record Screen"
2. Select screen/window to record
3. Record 30 seconds of screen activity
4. Stop recording
5. Verify clip auto-added to media library
6. Add to timeline and export

### Scenario 3: Multi-Clip Editing

1. Import 3 different video clips
2. Arrange clips in sequence on timeline
3. Trim first clip (remove first 5 seconds)
4. Split second clip in middle
5. Delete second half of split clip
6. Export 2-minute combined video
7. Verify seamless playback with no gaps

### Scenario 4: Webcam Overlay

1. Record screen capture (30 seconds)
2. Record webcam separately (30 seconds)
3. Add screen recording to Track 1
4. Add webcam to Track 2 (overlay)
5. Resize and position webcam clip in corner
6. Export with both tracks visible

### Scenario 5: Timeline Navigation

1. Import 5+ clips (60+ seconds total)
2. Zoom in on timeline for precise editing
3. Scrub through timeline by dragging playhead
4. Use play/pause to preview
5. Make trim adjustments with zoomed-in precision

### Scenario 6: Error Handling

1. Attempt to import unsupported format (AVI)
2. Verify user-friendly error message
3. Attempt export with insufficient disk space
4. Verify clear error message and guidance

---

## Performance Requirements

### Responsiveness

- **App Launch:** Under 5 seconds from click to usable interface
- **Timeline UI:** Remains responsive with 10+ clips on timeline
- **Preview Playback:** 30fps minimum, smooth scrubbing
- **Import:** Shows progress for large files (>500MB)
- **Export:** Real-time progress updates, no UI freezing

### Stability

- **No Crashes:** App should not crash during typical editing sessions
- **Memory Management:** No memory leaks during 15+ minute editing sessions
- **Long Exports:** Can export 5+ minute videos without crashing

### Output Quality

- **Video Quality:** Exported videos maintain reasonable quality (not over-compressed)
- **File Size:** Exported files not bloated (similar size to source at same resolution)
- **Audio Sync:** Audio remains synchronized throughout exported video
- **Visual Fidelity:** Colors, brightness match source videos

---

## User Interface Design

### Main Window Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ClipForge                                    [ _ ] [ ◻ ] [ X ]│
├─────────────────────────────────────────────────────────────┤
│  File  Edit  View  Help                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ MEDIA LIBRARY   │  │   VIDEO PREVIEW                 │  │
│  │                 │  │                                   │  │
│  │ [+] Import      │  │                                   │  │
│  │ [●] Record      │  │    [Preview Window]              │  │
│  │                 │  │                                   │  │
│  │ ┌──────┐        │  │                                   │  │
│  │ │Clip1 │ 00:45  │  │                                   │  │
│  │ └──────┘        │  │                                   │  │
│  │ ┌──────┐        │  │   [ ⏮ ] [ ▶ ] [ ⏭ ]  🔊 ━━━━   │  │
│  │ │Clip2 │ 01:20  │  └─────────────────────────────────┘  │
│  │ └──────┘        │                                        │
│  └─────────────────┘                                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ TIMELINE                                              │  │
│  │                                                         │  │
│  │ Track 1: ▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓      ▓▓▓▓                   │  │
│  │               ↑ Playhead                              │  │
│  │ Track 2:           ▓▓▓                                │  │
│  │                                                         │  │
│  │ [⊟ Zoom] ━━━━━━━━━━━━━━━━━━━━ 00:45 / 02:30          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [Export] [Save Project]                      Status: Ready  │
└─────────────────────────────────────────────────────────────┘
```

### Key UI Components

#### 1. Media Library Panel (Left Side)

- Import button (opens file picker)
- Record button (dropdown: Screen, Webcam, Both)
- Grid of imported clips with thumbnails
- Right-click menu on clips (Remove, Details)

#### 2. Preview Window (Top Right)

- Large video preview area
- Playback controls below preview
- Current time / Total duration display
- Volume control

#### 3. Timeline (Bottom)

- Multi-track layout (Track 1, Track 2, Track 3...)
- Horizontal scrollable timeline
- Zoom slider for timeline precision
- Time ruler above tracks
- Playhead (vertical red line)

#### 4. Top Menu Bar

- **File:** New Project, Open Project, Save Project, Import, Export, Quit
- **Edit:** Undo, Redo, Cut, Copy, Paste, Delete
- **View:** Zoom In, Zoom Out, Fit to Window
- **Help:** Documentation, About

#### 5. Toolbar (Optional)

- Quick access buttons: Import, Record, Split, Delete, Export

### UI/UX Principles

- **Clarity:** Obvious what each control does
- **Feedback:** Visual confirmation for all actions
- **Performance:** UI never freezes, show loading states
- **Accessibility:** Keyboard shortcuts for power users
- **Familiarity:** Similar to Premiere/Final Cut/CapCut layouts

---

## Technical Implementation Details

### FFmpeg Integration

#### Setup

1. Download FFmpeg static builds for macOS and Windows
2. Store binaries in `resources/ffmpeg/` directory
3. Package with Electron using `electron-builder` extra resources
4. Dynamically detect platform and use correct binary path

#### Usage with fluent-ffmpeg

```javascript
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = path.join(process.resourcesPath, "ffmpeg", "ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);

// Export example
ffmpeg()
  .input("clip1.mp4")
  .input("clip2.mp4")
  .complexFilter([
    // Define filter graph for overlays, trims, etc.
  ])
  .output("output.mp4")
  .on("progress", (progress) => {
    // Send progress to renderer process
  })
  .on("end", () => {
    // Export complete
  })
  .run();
```

### Recording Implementation

#### Screen Recording

```javascript
// Main process: Get available sources
const { desktopCapturer } = require("electron");

const sources = await desktopCapturer.getSources({
  types: ["screen", "window"],
});

// Renderer process: Start recording
const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: "desktop",
      chromeMediaSourceId: selectedSource.id,
    },
  },
});

const mediaRecorder = new MediaRecorder(stream);
// Handle dataavailable, stop events
```

#### Webcam Recording

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
  audio: true,
});

const mediaRecorder = new MediaRecorder(stream);
// Record to blob, save as file
```

### Timeline State Management

Recommended approach: React Context or Redux for timeline state.

```javascript
// Timeline state structure
{
  tracks: [
    {
      id: 'track-1',
      clips: [
        {
          id: 'clip-abc',
          fileId: 'file-123',
          startTime: 0,
          endTime: 30,
          trimStart: 5,
          trimEnd: 25,
          position: 0  // Position on timeline in seconds
        }
      ]
    }
  ],
  playhead: 0,  // Current time in seconds
  duration: 120,  // Total timeline duration
  zoom: 1
}
```

### File Management

#### Import

- Store imported files in state with unique IDs
- Keep reference to file path on disk
- Generate thumbnail using FFmpeg (extract frame at 1 second)

#### Project Save

```json
{
  "version": "1.0",
  "created": "2025-10-27T12:00:00Z",
  "timeline": {
    "tracks": [...],
    "duration": 120
  },
  "media": [
    {
      "id": "file-123",
      "path": "/Users/john/Videos/clip1.mp4",
      "duration": 45,
      "resolution": "1920x1080"
    }
  ]
}
```

### IPC Communication

Main process handles:

- File system access
- FFmpeg processing
- System dialogs (open/save)

Renderer process handles:

- UI rendering
- Timeline manipulation
- Preview playback

Use Electron IPC for communication:

```javascript
// Renderer → Main
ipcRenderer.invoke("export-video", exportConfig);

// Main → Renderer (progress updates)
ipcRenderer.on("export-progress", (event, progress) => {
  updateProgressBar(progress.percent);
});
```

---

## Development Milestones

### Day 1 (Monday, Oct 27) - Foundation

**Goal: Reach MVP checkpoint by end of Day 2**

- [ ] Set up Electron + React project structure
- [ ] Configure bundled FFmpeg (download binaries, test paths)
- [ ] Build basic UI layout (media library, preview, timeline)
- [ ] Implement video import (drag-drop + file picker)
- [ ] Display imported clips in media library with thumbnails
- [ ] Basic video player (play single clip in preview window)

### Day 2 (Tuesday, Oct 28) - MVP Checkpoint

**Deadline: 10:59 PM CT**

- [ ] Build timeline UI (visual tracks, playhead, time ruler)
- [ ] Drag clips from library to timeline
- [ ] Implement trim functionality (adjust clip start/end)
- [ ] Scrubbing (drag playhead, preview updates)
- [ ] Export single clip or timeline to MP4 using FFmpeg
- [ ] Package app as native distributable
- [ ] **Submit MVP checkpoint**

### Day 3 (Wednesday, Oct 29) - Full Features

**Deadline: 10:59 PM CT**

- [ ] Implement screen recording (source selection, start/stop/pause)
- [ ] Implement webcam recording
- [ ] Multi-track timeline support (2-3 tracks)
- [ ] Split clip functionality
- [ ] Delete clip functionality
- [ ] Real-time preview of multi-track composition
- [ ] Export with progress indicator
- [ ] Error handling for import/export
- [ ] Polish UI/UX
- [ ] Test on Mac and Windows (if possible)
- [ ] Record demo video (3-5 minutes)
- [ ] **Submit final project**

### Stretch Goals (If Time Permits)

- [ ] Save/load projects
- [ ] Keyboard shortcuts
- [ ] Undo/redo
- [ ] Transitions or text overlays
- [ ] Real-time PiP recording (Option A)

---

## Submission Deliverables

### Required by Wednesday, Oct 29 at 10:59 PM CT:

1. **GitHub Repository**

   - Clean, organized code
   - README.md with:
     - Setup instructions (how to install dependencies)
     - Build instructions (how to package app)
     - Architecture overview (key components, tech decisions)
     - Known issues or limitations
   - `.gitignore` (exclude node_modules, build artifacts)

2. **Demo Video (3-5 minutes)**

   - Show app launch
   - Import clips into media library
   - Record screen or webcam
   - Arrange clips on timeline
   - Trim and split clips
   - Export video
   - Show final exported video playing
   - Mention any stretch goals completed

3. **Packaged Desktop App**

   - macOS: `.dmg` or `.app` bundle
   - Windows: `.exe` installer
   - Host on GitHub Releases, Google Drive, or Dropbox
   - Include download link in README
   - Or provide clear build instructions if distributable is too large

4. **Architecture Documentation**
   - Brief explanation of:
     - How FFmpeg is integrated
     - How timeline state is managed
     - How recording works
     - Key technical challenges overcome
   - Can be section in README or separate `ARCHITECTURE.md`

### Quality Checklist

- [ ] App launches without errors
- [ ] Can import and play video files
- [ ] Timeline is functional (drag, trim, split)
- [ ] Export produces valid MP4 file
- [ ] Recording works (screen and/or webcam)
- [ ] No critical bugs that block core workflow
- [ ] Code is reasonably clean and commented
- [ ] README has clear setup/build instructions

---

## Success Criteria

### Minimum Viable Success (Pass)

- All MVP requirements met by Tuesday checkpoint
- App can import, edit, and export videos
- At least one recording method works (screen or webcam)
- Demo video shows complete workflow
- Code is submitted on time

### Target Success (Strong Pass)

- All core features implemented
- Both screen and webcam recording work
- Multi-track timeline with overlay support
- Polished UI with good UX
- No major bugs during testing scenarios
- Clean, well-structured code

### Exceptional Success (Outstanding)

- All core features + multiple stretch goals
- Real-time PiP recording (Option A)
- Save/load projects
- Keyboard shortcuts and undo/redo
- Smooth, professional UI/UX
- Tested on both Mac and Windows
- Outstanding demo video

---

## Risk Mitigation

### High-Risk Areas

1. **FFmpeg Integration Complexity**

   - **Risk:** Difficulty getting FFmpeg to work across platforms
   - **Mitigation:** Test FFmpeg setup on Day 1, use fluent-ffmpeg wrapper, have fallback to simpler export if needed

2. **Timeline Performance**

   - **Risk:** Timeline becomes laggy with many clips
   - **Mitigation:** Optimize rendering (virtualization, throttle updates), test with 10+ clips early

3. **Recording API Issues**

   - **Risk:** Screen/webcam recording doesn't work on all systems
   - **Mitigation:** Prioritize one platform (Mac) first, test recording on Day 2, have clear error messages

4. **Export Failures**

   - **Risk:** FFmpeg encoding fails with certain video formats
   - **Mitigation:** Test export early and often, handle errors gracefully, limit supported input formats

5. **Time Constraints**
   - **Risk:** 72 hours is very tight for a desktop app
   - **Mitigation:** Strict prioritization (MVP first), cut stretch goals if needed, focus on core loop (import → edit → export)

### Contingency Plans

- **If recording is too complex:** Focus on import/edit/export workflow, make recording a stretch goal
- **If multi-track is too hard:** Ship with single track, add overlays as stretch goal
- **If packaging fails:** Provide dev mode instructions, host source code prominently
- **If one platform fails:** Focus on one platform (Mac or Windows), document limitation

---

## Non-Functional Requirements

### Usability

- Intuitive interface for first-time users
- Consistent UI patterns (buttons, icons, layout)
- Helpful error messages (no cryptic errors)
- Clear visual feedback for all actions

### Reliability

- App doesn't crash during normal use
- Handles edge cases gracefully (missing files, invalid formats)
- Exports complete successfully without corruption

### Performance

- Fast app launch (<5 seconds)
- Responsive UI (no freezing)
- Efficient memory usage (no leaks)
- Reasonable export times (1-2 min for 2-min video)

### Maintainability

- Clean, readable code
- Logical file/folder structure
- Comments for complex logic
- Reusable components

### Portability

- Works on macOS (primary)
- Works on Windows (secondary)
- Consistent experience across platforms

---

## Out of Scope

**Explicitly NOT included in this 72-hour sprint:**

- ❌ Cloud uploads or sharing (no backend)
- ❌ User authentication or accounts
- ❌ Collaboration features (multi-user editing)
- ❌ Mobile app version
- ❌ Advanced color grading or VFX
- ❌ 4K or higher resolution support (unless trivial)
- ❌ Batch export (multiple videos at once)
- ❌ Plugin system or extensibility
- ❌ AI features (auto-editing, transcription)
- ❌ Live streaming integration
- ❌ Social media API integration
- ❌ Monetization or licensing system

---

## Appendix

### Recommended Libraries

**Core:**

- `electron` - Desktop framework
- `react`, `react-dom` - UI framework
- `fluent-ffmpeg` - FFmpeg wrapper for Node.js

**Timeline/Canvas:**

- `fabric.js` or `konva` - Canvas manipulation
- `react-dnd` - Drag and drop
- `react-player` - Video player component (optional)

**Utilities:**

- `electron-builder` - Package app for distribution
- `uuid` - Generate unique IDs for clips
- `dayjs` or `date-fns` - Time formatting

**Optional:**

- `zustand` or `redux` - State management (if needed)
- `framer-motion` - Animations
- `react-icons` - Icon library

### FFmpeg Resources

- **Download Static Builds:** https://ffmpeg.org/download.html
- **fluent-ffmpeg Docs:** https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- **FFmpeg Filters Documentation:** https://ffmpeg.org/ffmpeg-filters.html
- **Overlay Filter Example:** https://trac.ffmpeg.org/wiki/Scaling

### Electron Resources

- **Main/Renderer Process IPC:** https://www.electronjs.org/docs/latest/tutorial/ipc
- **desktopCapturer API:** https://www.electronjs.org/docs/latest/api/desktop-capturer
- **Packaging Apps:** https://www.electronjs.org/docs/latest/tutorial/application-distribution

### Testing Checklist

Before submission, verify:

- [ ] App launches on clean machine (test install)
- [ ] Import works with all supported formats (MP4, MOV, WebM)
- [ ] Timeline can handle 10+ clips without lag
- [ ] Export produces valid video file
- [ ] Exported video plays in VLC, QuickTime, Windows Media Player
- [ ] Recording works (screen and webcam)
- [ ] All buttons and controls are functional
- [ ] No console errors during normal usage
- [ ] Demo video clearly shows all features

---

## Final Notes

This is an aggressive timeline. **Prioritize ruthlessly:**

1. **MVP first** (Tuesday checkpoint is critical)
2. **Core features second** (import, timeline, export, recording)
3. **Polish third** (UI, error handling, edge cases)
4. **Stretch goals last** (only if time permits)

**Remember:**

- A simple, working video editor beats a feature-rich app that crashes
- Focus on the core loop: Record → Import → Arrange → Export
- Test export early and often (FFmpeg can be tricky)
- Package your app early (don't leave it for last minute)
- **Just submit** - Don't miss the deadline

Good luck! You're building a desktop video editor in 72 hours. It's hard, but you can do it. 🚀

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025  
**Author:** Product Team  
**Status:** Final
