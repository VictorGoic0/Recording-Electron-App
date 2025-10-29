# ClipCreate - Development Tasks

## Overview

This document breaks down the ClipCreate project into 10 pull requests (PRs), each with numbered subtasks. Complete PRs 1-6 by Tuesday 10:59 PM CT for MVP, then PRs 7-10 by Wednesday 10:59 PM CT for final submission.

---

## PR #1: Project Setup & Foundation

**Goal:** Set up Electron + React project with basic structure  
**Estimated Time:** 3-4 hours  
**Priority:** CRITICAL (Do First)

### Subtasks

- [x] 1. Initialize new Electron + React project

  - Run `npm init` or use `electron-react-boilerplate`
  - Configure TypeScript (optional) or stick with JavaScript
  - Set up folder structure: `/src/main`, `/src/renderer`, `/src/components`

- [x] 2. Configure Electron main process

  - Create `main.js` with basic window creation
  - Set up window dimensions (1280x800 minimum)
  - Configure dev tools in development mode
  - Add window state management (remember size/position)

- [x] 3. Set up React in renderer process

  - Create basic App component
  - Set up React Router (if needed for multiple views)
  - Configure hot module reloading for development

- [x] 4. Install core dependencies

  - `electron`, `react`, `react-dom`
  - `electron-builder` for packaging
  - `concurrently` for running main + renderer processes
  - Add to `package.json` scripts: `dev`, `build`, `package`

- [x] 5. Configure build and packaging

  - Set up `electron-builder` configuration
  - Define build targets (Mac `.dmg`, Windows `.exe`)
  - Configure app icon and metadata
  - Test packaging in dev mode

- [x] 6. Set up basic UI layout structure

  - Create main container with 3 sections: Media Library, Preview, Timeline
  - Use CSS Grid or Flexbox for layout
  - Add placeholder divs for each section
  - Ensure responsive resizing

- [x] 7. Add basic styling

  - Choose color scheme (dark mode recommended for video editing)
  - Set up CSS variables for theme colors
  - Add basic typography (fonts, sizes)
  - Style window chrome (title bar if custom)

- [ ] 8. Test app launch
  - Verify app opens without errors
  - Check all placeholder sections render
  - Test window minimize/maximize/close
  - Confirm hot reload works in dev mode

**PR Completion Criteria:**

- App launches successfully
- Basic 3-panel layout visible
- Can package app as distributable
- No console errors on launch

---

## PR #2: FFmpeg Integration & Setup

**Goal:** Bundle FFmpeg and create wrapper for video processing  
**Estimated Time:** 3-4 hours  
**Priority:** CRITICAL (Do Early)

### Subtasks

- [x] 1. Download FFmpeg static binaries

  - Get macOS build from https://ffmpeg.org/download.html or https://evermeet.cx/ffmpeg/
  - Get Windows build from https://www.gyan.dev/ffmpeg/builds/
  - Store in `/resources/ffmpeg/` directory (separate folders for mac/win)

- [x] 2. Configure FFmpeg bundling

  - Add FFmpeg binaries to `electron-builder` extraResources
  - Update build config to include binaries in package
  - Handle platform-specific paths (macOS vs Windows)

- [x] 3. Install fluent-ffmpeg

  - `npm install fluent-ffmpeg`
  - `npm install @ffmpeg-installer/ffmpeg` (fallback option)
  - Choose one approach and stick with it

- [x] 4. Create FFmpeg service module

  - New file: `/src/main/services/ffmpegService.js`
  - Detect platform and set FFmpeg binary path
  - Export configured ffmpeg instance
  - Add error handling for missing binary

- [x] 5. Test FFmpeg installation

  - Create simple test: get video metadata
  - Test with a sample MP4 file
  - Verify FFmpeg executes without errors
  - Log FFmpeg version to confirm it's working

- [x] 6. Create basic video info extractor

  - Function to extract duration from video file
  - Function to extract resolution (width x height)
  - Function to extract file size
  - Function to extract codec information

- [x] 7. Create thumbnail generator

  - Function to extract frame at 1 second as thumbnail
  - Save thumbnail as base64 or temp file
  - Return thumbnail data for UI display

- [x] 8. Set up IPC for FFmpeg operations
  - Create IPC handlers in main process for FFmpeg calls
  - Add handlers: `get-video-info`, `generate-thumbnail`
  - Test IPC communication from renderer process

**PR Completion Criteria:**

- FFmpeg binary bundled with app
- Can extract video metadata (duration, resolution)
- Can generate thumbnail from video
- IPC communication working between main/renderer

---

## PR #3: Video Import & Media Library

**Goal:** Allow users to import videos and display them in media library  
**Estimated Time:** 4-5 hours  
**Priority:** MVP CRITICAL

### Subtasks

- [x] 1. Create Media Library component

  - New file: `/src/renderer/components/MediaLibrary.jsx`
  - Design grid layout for clip thumbnails
  - Add "Import" button at top
  - Style with hover effects

- [x] 2. Implement file picker import

  - Add click handler to "Import" button
  - Use Electron's `dialog.showOpenDialog()` in main process
  - Filter for supported formats: `.mp4`, `.mov`, `.webm`
  - Allow multiple file selection

- [x] 3. Implement drag-and-drop import

  - Add drag-and-drop event listeners to MediaLibrary component
  - Handle `dragover`, `dragleave`, `drop` events
  - Prevent default browser behavior (opening file in window)
  - Visual feedback when dragging over drop zone

- [x] 4. Create media file processing pipeline

  - When file imported, generate unique ID (use `uuid`)
  - Extract metadata using FFmpeg (duration, resolution, file size)
  - Generate thumbnail image
  - Store in application state

- [x] 5. Set up media state management

  - Create state for imported media (React Context or Redux)
  - State structure: `{ id, filename, path, duration, resolution, fileSize, thumbnail }`
  - Add actions: `addMedia`, `removeMedia`
  - Persist state in memory (no database needed for MVP)

- [x] 6. Display imported clips in grid

  - Map over media state and render ClipCard components
  - Show thumbnail image
  - Display filename below thumbnail
  - Show duration badge on thumbnail
  - Show resolution and file size on hover

- [x] 7. Add right-click context menu

  - Install `electron-context-menu` or create custom
  - Add "Remove from Library" option
  - Add "Reveal in Finder/Explorer" option
  - Handle menu item clicks

- [x] 8. Implement error handling

  - Catch unsupported file formats
  - Show error message: "Unsupported format. Please use MP4, MOV, or WebM"
  - Handle corrupted files gracefully
  - Display error toast or modal

- [x] 9. Add loading states
  - Show spinner while processing large files
  - Display progress for thumbnail generation
  - Disable import button while processing

**PR Completion Criteria:**

- Can import videos via file picker
- Can import videos via drag-and-drop
- Imported clips display in media library with thumbnails
- Can remove clips from library
- Supported formats only: MP4, MOV, WebM

---

## PR #4: Video Preview Player

**Goal:** Build video player that previews imported clips  
**Estimated Time:** 3-4 hours  
**Priority:** MVP CRITICAL

### Subtasks

- [x] 1. Create VideoPlayer component

  - New file: `/src/renderer/components/VideoPlayer.jsx`
  - Use HTML5 `<video>` element as base
  - Add ref for programmatic control
  - Style preview window (16:9 aspect ratio, black background)

- [x] 2. Implement video source loading

  - Load selected clip from media library into player
  - Handle file path (use `file://` protocol or convert to blob URL)
  - Update player when different clip selected
  - Handle video load errors

- [x] 3. Add playback controls

  - Play/Pause button (or spacebar)
  - Visual play/pause icon
  - Sync button state with video playback state
  - Handle click and keyboard events

- [x] 4. Add time display

  - Show current time in MM:SS format
  - Show total duration in MM:SS format
  - Display as "00:45 / 02:30"
  - Update current time during playback

- [x] 5. Add progress bar / scrubber

  - Visual progress bar showing playback position
  - Make progress bar clickable (seek to clicked position)
  - Make progress bar draggable (scrub through video)
  - Update progress bar during playback

- [x] 6. Add volume control

  - Volume slider (0-100%)
  - Mute/unmute button
  - Remember volume preference
  - Visual feedback for volume level

- [x] 7. Implement seeking functionality

  - Allow jumping to specific time by clicking timeline
  - Smooth seeking without lag
  - Update video currentTime property
  - Show frame at new position

  [x] 8. Add keyboard shortcuts

  - Spacebar: Play/Pause
  - Arrow Left: Skip back 10 seconds
  - Arrow Right: Skip forward 10 seconds
  - Arrow Up: Increase volume
  - Arrow Down: Decrease volume

- [x] 9. Handle edge cases
  - Video too large for preview window (scale to fit)
  - Audio-only files (show placeholder)
  - Unsupported codecs (show error message)
  - Missing files (show "File not found")

**PR Completion Criteria:**

- Can play imported video clips in preview window
- Play/Pause controls work
- Can scrub through video
- Time display updates correctly
- Audio plays synchronized with video

---

## PR #5: Basic Timeline UI

**Goal:** Create visual timeline with track layout and playhead  
**Estimated Time:** 5-6 hours  
**Priority:** MVP CRITICAL

### Subtasks

- [x] 1. Create Timeline component

  - New file: `/src/renderer/components/Timeline.jsx`
  - Set up horizontal scrollable container
  - Define fixed height (300-400px)
  - Style with dark background, grid lines

- [x] 2. Create time ruler

  - Display time markers (0s, 10s, 20s, 30s, etc.)
  - Position at top of timeline
  - Show tick marks for precision
  - Update scale based on zoom level

- [x] 3. Create track system

  - Track 1: Main video track
  - Track 2: Overlay/PiP track
  - Visual separation between tracks (borders/colors)
  - Label tracks ("Main", "Overlay")

- [x] 4. Implement playhead

  - Vertical red line indicating current time
  - Position based on current time state
  - Draggable to scrub through timeline
  - Snaps to frame boundaries (optional)

- [x] 5. Create timeline state management

  - State structure: `{ tracks: [], playhead: 0, duration: 0, zoom: 1 }`
  - Track structure: `{ id, clips: [] }`
  - Clip structure: `{ id, fileId, startTime, endTime, position, track }`
  - Actions: `addClipToTimeline`, `removeClipFromTimeline`, `updateClipPosition`

- [x] 6. Implement drag-from-library-to-timeline

  - Make media library clips draggable
  - Add drop zone on timeline tracks
  - Visual feedback when dragging (highlight drop zone)
  - Calculate drop position based on mouse X coordinate

- [x] 7. Display clips on timeline

  - Render clip blocks on appropriate track
  - Width based on clip duration and zoom level
  - Show clip thumbnail or name inside block
  - Color code clips for visual distinction

- [x] 8. Implement zoom controls

  - Zoom in button (increase time scale)
  - Zoom out button (decrease time scale)
  - Zoom slider (1x to 10x zoom)
  - Recalculate clip widths on zoom change

- [x] 9. Implement horizontal scrolling

  - Enable scrollbar for long timelines
  - Smooth scrolling behavior
  - Keep playhead visible when scrolling
  - Snap scroll to clip boundaries (optional)

- [x] 10. Sync timeline playhead with video player
  - When video plays, move timeline playhead
  - When playhead dragged, update video currentTime
  - Bidirectional sync between timeline and player

**PR Completion Criteria:**

- Timeline renders with tracks and time ruler
- Can drag clips from media library onto timeline
- Clips display on timeline with correct duration
- Playhead moves during playback
- Zoom in/out works

---

## PR #6: Trim & Export (MVP Completion)

**Goal:** Implement clip trimming and basic export to MP4  
**Estimated Time:** 5-6 hours  
**Priority:** MVP CRITICAL (Must complete by Tuesday 10:59 PM CT)

### Subtasks

- [x] 1. Implement trim handles on timeline clips

  - Add left and right edge handles on clip blocks
  - Style handles (different color, drag cursor)
  - Make handles draggable
  - Constrain drag to clip boundaries

- [x] 2. Create trim logic

  - When left handle dragged, update clip `trimStart`
  - When right handle dragged, update clip `trimEnd`
  - Update clip visual width during trim
  - Show trimmed duration while dragging

- [x] 3. Update clip metadata after trim

  - Store trim points in clip state: `{ trimStart: 5, trimEnd: 25 }`
  - Calculate effective duration: `endTime - startTime`
  - Update timeline duration if needed
  - Reflect trim in preview player

- [ ] 4. Create export service module

  - New file: `/src/main/services/exportService.js`
  - Function to generate FFmpeg export command
  - Handle single clip export first
  - Build FFmpeg filter chain for trims

- [ ] 5. Implement basic export flow

  - Add "Export" button in UI
  - Open save dialog (choose destination)
  - Collect timeline data (clips, trim points, tracks)
  - Send to main process via IPC

- [ ] 6. Build FFmpeg export command

  - Input: timeline state with clips and trim points
  - For single clip: `ffmpeg -i input.mp4 -ss <start> -to <end> output.mp4`
  - For multiple clips: use concat demuxer or filter
  - Set output codec: H.264 video, AAC audio
  - Set resolution: 1080p (1920x1080) for MVP

- [ ] 7. Execute export with progress tracking

  - Run FFmpeg command asynchronously
  - Track progress via FFmpeg output parsing
  - Send progress updates to renderer via IPC
  - Handle export completion and errors

- [ ] 8. Create export UI modal

  - Show during export: progress bar, percentage, time remaining
  - "Cancel" button to abort export
  - Display current processing step
  - Show success message on completion

- [ ] 9. Handle export errors

  - Catch FFmpeg errors
  - Show user-friendly error messages
  - Check disk space before starting (optional for MVP)
  - Log errors for debugging

- [ ] 10. Test export with single clip

  - Import one video, trim it, export
  - Verify output plays correctly
  - Check file size is reasonable
  - Confirm audio is synchronized

- [ ] 11. Test export with multiple clips
  - Arrange 2-3 clips on timeline
  - Export as single video
  - Verify seamless transitions (no gaps)
  - Check total duration is correct

**PR Completion Criteria:**

- Can trim clips by dragging edge handles
- Can export timeline to MP4 file
- Export progress indicator works
- Exported video plays correctly in media players
- **MVP CHECKPOINT PASSED** ✅

---

## PR #7: Screen Recording

**Goal:** Implement screen capture and save to media library  
**Estimated Time:** 5-6 hours  
**Priority:** HIGH (Wednesday deadline)

### Subtasks

- [ ] 1. Add "Record" button to UI

  - Add to Media Library panel or toolbar
  - Dropdown menu: "Screen", "Webcam", "Both"
  - Style with record icon (red dot)

- [ ] 2. Implement screen source selection (Electron)

  - Use `desktopCapturer.getSources()` to list screens and windows
  - Display source picker modal/dialog
  - Show thumbnails of available sources
  - Allow user to select which screen/window to record

- [ ] 3. Set up MediaRecorder for screen recording

  - Request screen stream via `getUserMedia()` with desktopCapturer source
  - Create `MediaRecorder` instance
  - Configure codec: VP8 or H264 if supported
  - Set bitrate for quality

- [ ] 4. Implement recording controls

  - Start button: Begin recording
  - Stop button: End recording and save
  - Pause/Resume buttons: Pause recording mid-capture
  - Recording timer: Show elapsed time (00:00)

- [ ] 5. Add countdown before recording

  - 3-2-1 countdown overlay
  - Visual and/or audio cue
  - Start recording after countdown finishes
  - Allow skip countdown option (advanced)

- [ ] 6. Capture microphone audio during recording

  - Request microphone access via `getUserMedia({ audio: true })`
  - Combine screen video stream + audio stream
  - Handle microphone permission denial gracefully
  - Show microphone selection dropdown

- [ ] 7. Save recording to file

  - Collect recorded chunks from MediaRecorder
  - Combine chunks into Blob
  - Convert Blob to file and save to disk
  - Auto-generate filename with timestamp: `screen-recording-2025-10-27-14-30-45.webm`

- [ ] 8. Add recorded file to media library

  - Process saved file (extract metadata, generate thumbnail)
  - Add to media library state automatically
  - Show notification: "Recording saved to library"

- [ ] 9. Show recording indicator during capture

  - Red dot or "REC" badge on UI
  - Timer showing elapsed recording time
  - Pulsing animation to indicate active recording

- [ ] 10. Handle recording errors

  - Permission denied: Show message, guide user to settings
  - No screen sources available: Show error
  - Recording failed: Show error, allow retry

- [ ] 11. Add audio level meter (optional for stretch)
  - Visual indicator of microphone input level
  - Prevents recording silent audio
  - Real-time feedback during recording

**PR Completion Criteria:**

- Can select screen/window to record
- Can start, pause, stop recording
- Recording saves to media library automatically
- Microphone audio captured during recording
- Countdown before recording starts

---

## PR #8: Webcam Recording

**Goal:** Implement webcam capture and save to media library  
**Estimated Time:** 3-4 hours  
**Priority:** HIGH (Wednesday deadline)

### Subtasks

- [ ] 1. Implement camera source selection

  - Use `navigator.mediaDevices.enumerateDevices()` to list cameras
  - Display camera picker dropdown
  - Allow user to select which camera to use
  - Default to first available camera

- [ ] 2. Set up MediaRecorder for webcam recording

  - Request webcam stream via `getUserMedia({ video: true, audio: true })`
  - Create `MediaRecorder` instance
  - Configure resolution: 1280x720 for performance
  - Set codec and bitrate

- [ ] 3. Show webcam preview before recording

  - Display live webcam feed in modal/preview window
  - Allow user to see themselves before starting
  - "Start Recording" button below preview
  - "Cancel" button to close without recording

- [ ] 4. Implement recording controls (same as screen)

  - Start, Stop, Pause/Resume buttons
  - Recording timer
  - Countdown before recording starts
  - Audio level meter for microphone

- [ ] 5. Save webcam recording to file

  - Collect recorded chunks
  - Save as `.webm` or `.mp4`
  - Auto-generate filename: `webcam-recording-2025-10-27-14-30-45.webm`
  - Add to media library automatically

- [ ] 6. Handle webcam errors

  - No camera detected: Show message
  - Permission denied: Guide user to settings
  - Camera in use by another app: Show error

- [ ] 7. Add camera settings (stretch)
  - Resolution options (720p, 1080p)
  - Frame rate options (30fps, 60fps)
  - Mirror video toggle (flip horizontal)

**PR Completion Criteria:**

- Can select and record from webcam
- Webcam preview shows before recording
- Recording saves to media library
- All recording controls work (start/stop/pause/countdown)

---

## PR #9: Multi-Track Timeline & Split Functionality

**Goal:** Support multiple tracks for overlays and add split clip feature  
**Estimated Time:** 4-5 hours  
**Priority:** HIGH (Wednesday deadline)

### Subtasks

- [ ] 1. Expand timeline to support 2-3 tracks

  - Track 1: Main video
  - Track 2: Overlay (e.g., webcam PiP)
  - Track 3: Additional overlay (optional)
  - Visual stacking (Track 2 appears above Track 1)

- [ ] 2. Update drag-and-drop to support track selection

  - Detect which track user drops clip onto
  - Assign clip to appropriate track in state
  - Visual feedback showing target track

- [ ] 3. Implement multi-track rendering in preview

  - Overlay Track 2 clips on top of Track 1 clips
  - Handle positioning: Track 2 clips render at reduced size in corner
  - Allow dragging Track 2 clips to reposition (stretch)
  - Allow resizing Track 2 clips (stretch)

- [ ] 4. Update export to handle multiple tracks

  - Build FFmpeg overlay filter: `[0:v][1:v]overlay=10:10`
  - Position Track 2 clips at specified coordinates
  - Scale Track 2 clips to smaller size (e.g., 320x180 for PiP)
  - Composite all tracks into single output

- [ ] 5. Implement split clip functionality

  - Add "Split" button or keyboard shortcut (Cmd/Ctrl+K)
  - Position playhead where split should occur
  - Split clip at playhead position into two separate clips
  - Update timeline state: remove original clip, add two new clips

- [ ] 6. Create split logic

  - Original clip: `{ startTime: 0, endTime: 30 }`
  - After split at 15s:
    - Clip 1: `{ startTime: 0, endTime: 15 }`
    - Clip 2: `{ startTime: 15, endTime: 30 }`
  - Preserve trim points and other metadata

- [ ] 7. Add visual split indicator

  - Show split line at playhead position when hovering over clip
  - Highlight clip that will be split
  - Confirm split with button click or keyboard shortcut

- [ ] 8. Implement delete clip functionality

  - Select clip on timeline (click to select)
  - Press Delete or Backspace key to remove
  - Or right-click → Delete from context menu
  - Confirm deletion with modal (optional)

- [ ] 9. Add track mute/solo controls (stretch)

  - Mute button per track (disable audio)
  - Solo button per track (mute all others)
  - Visual indication of muted tracks

- [ ] 10. Handle overlapping clips (if time permits)
  - Prevent clips from overlapping on same track
  - Auto-adjust clip positions to avoid overlap
  - Or show error if user tries to overlap

**PR Completion Criteria:**

- Timeline supports 2-3 tracks
- Can drag clips to different tracks
- Preview shows overlaid tracks (PiP effect)
- Can split clips at playhead
- Can delete clips from timeline
- Export works with multiple tracks

---

## PR #10: Polish, Error Handling & Packaging

**Goal:** Final polish, comprehensive error handling, and package for submission  
**Estimated Time:** 4-5 hours  
**Priority:** CRITICAL (Wednesday deadline)

### Subtasks

- [ ] 1. Implement comprehensive error handling

  - **Import errors:**
    - Unsupported format: "Unsupported format. Please use MP4, MOV, or WebM"
    - Large file warning: "This file is very large (XGB). Processing may take time."
    - Corrupted file: "This file appears corrupted or cannot be read"
  - **Export errors:**
    - Insufficient disk space: "Not enough disk space. Need XGB free."
    - Export failed: "Export failed. Check disk space and try again."
    - Missing source files: "Cannot export: source file 'video.mp4' not found."
  - **Recording errors:**
    - Permission denied: "Camera/Screen permission denied. Enable in System Preferences."
    - No sources: "No camera/screen detected."

- [ ] 2. Add loading states throughout app

  - Spinner during video import processing
  - Progress bar during thumbnail generation
  - Loading indicator during export
  - Disable buttons during async operations

- [ ] 3. Add toast notifications

  - Success messages: "Video imported successfully", "Export complete"
  - Error messages: Show errors in non-intrusive toasts
  - Use library like `react-toastify` or create custom

- [ ] 4. Implement UI/UX polish

  - Smooth animations for drag-and-drop
  - Hover effects on buttons and clips
  - Consistent spacing and alignment
  - Proper focus states for accessibility

- [ ] 5. Add keyboard shortcuts documentation

  - Create help modal showing all shortcuts
  - Accessible via Help menu or keyboard shortcut
  - List: Spacebar (play/pause), Cmd/Ctrl+K (split), Delete (remove), etc.

- [ ] 6. Optimize timeline performance

  - Virtual rendering for timelines with many clips
  - Throttle scrubbing updates
  - Debounce zoom changes
  - Profile performance with 10+ clips

- [ ] 7. Test all features end-to-end

  - Run through all testing scenarios from PRD
  - Test on both Mac and Windows (if possible)
  - Fix any critical bugs found
  - Ensure no console errors

- [ ] 8. Build and package app for distribution

  - Run `npm run build` or `electron-builder build`
  - Test packaged app on clean machine
  - Verify FFmpeg binary is included
  - Check app size (should be <200MB)

- [ ] 9. Create distribution artifacts

  - macOS: `.dmg` file
  - Windows: `.exe` installer
  - Upload to GitHub Releases or Google Drive
  - Get shareable download links

- [ ] 10. Write README.md

  - Setup instructions (install Node, npm install, npm start)
  - Build instructions (npm run build)
  - System requirements (macOS 10.14+, Windows 10+)
  - Known issues or limitations
  - Architecture overview

- [ ] 11. Record demo video (3-5 minutes)

  - Show app launch
  - Import clips
  - Record screen or webcam
  - Edit on timeline (trim, split, arrange)
  - Export final video
  - Show exported video playing

- [ ] 12. Prepare final submission
  - Push all code to GitHub
  - Upload packaged app with download link
  - Upload demo video to YouTube or include in repo
  - Double-check all submission requirements met

**PR Completion Criteria:**

- All error messages are user-friendly
- App is polished with smooth UX
- Packaged app works on clean machine
- README with clear instructions
- Demo video recorded and submitted
- **FINAL SUBMISSION COMPLETE** ✅

---

## Stretch Goals (After PR #10, if time permits)

### PR #11: Save/Load Projects (Stretch)

- [ ] 1. Add "Save Project" button
- [ ] 2. Serialize timeline state to JSON
- [ ] 3. Use `dialog.showSaveDialog()` to choose location
- [ ] 4. Save JSON file with `.clipcreate` extension
- [ ] 5. Add "Open Project" button
- [ ] 6. Load JSON file and restore timeline state
- [ ] 7. Validate all source video files still exist
- [ ] 8. Show warning if files moved/deleted

### PR #12: Undo/Redo (Stretch)

- [ ] 1. Implement undo/redo stack
- [ ] 2. Track all timeline state changes
- [ ] 3. Cmd/Ctrl+Z for undo
- [ ] 4. Cmd/Ctrl+Shift+Z for redo
- [ ] 5. Limit history to last 50 actions

### PR #13: Transitions (Stretch)

- [ ] 1. Add fade in/out transitions
- [ ] 2. Add cross-dissolve between clips
- [ ] 3. Apply transitions in export FFmpeg command
- [ ] 4. UI controls for transition duration

### PR #14: Text Overlays (Stretch)

- [ ] 1. Add text layer to timeline
- [ ] 2. Text editor with font/size/color controls
- [ ] 3. Position text on video preview
- [ ] 4. Render text in export using FFmpeg drawtext filter

### PR #15: Real-Time PiP Recording (Stretch - Option A)

- [ ] 1. Capture screen and webcam streams simultaneously
- [ ] 2. Use Canvas to composite webcam onto screen in real-time
- [ ] 3. Record composite stream with MediaRecorder
- [ ] 4. Save as single output file
- [ ] 5. Add webcam position/size controls during recording

### PR #16: Canvas-Based Timeline Rendering (Stretch)

**Goal:** Replace React-based timeline rendering with Canvas for buttery-smooth 60fps scrubbing

- [ ] 1. Create Canvas timeline renderer
  - Replace React clip divs with Canvas drawing
  - Draw clips, trim handles, playhead directly to canvas
  - Handle mouse events on canvas (click, drag detection)
- [ ] 2. Implement pixel-perfect mouse tracking
  - Convert mouse coordinates to timeline position
  - Direct visual updates without React re-renders
  - Immediate feedback on drag (no state propagation delay)
- [ ] 3. Optimize rendering loop
  - Only redraw when necessary (dirty flag pattern)
  - Use requestAnimationFrame for smooth 60fps
  - Separate layers: background grid, clips, playhead, handles
- [ ] 4. Maintain feature parity
  - Trim handles with drag
  - Clip selection
  - Playhead scrubbing
  - Zoom controls
- [ ] 5. Benchmark performance
  - Test with 50+ clips on timeline
  - Measure frame rate during scrubbing
  - Compare to React-based approach

**Benefits:**

- True real-time scrubbing (60fps)
- Handles hundreds of clips without lag
- Industry-standard approach (Premiere, Final Cut)

---

## Daily Breakdown

### Monday, Oct 27 (Day 1)

**Goal: Foundation + Import + Preview**

- Complete PR #1 (Project Setup)
- Complete PR #2 (FFmpeg Integration)
- Complete PR #3 (Video Import)
- Start PR #4 (Video Player)

### Tuesday, Oct 28 (Day 2) - MVP DEADLINE 10:59 PM CT

**Goal: Timeline + Trim + Export (MVP)**

- Finish PR #4 (Video Player)
- Complete PR #5 (Timeline UI)
- Complete PR #6 (Trim & Export)
- **SUBMIT MVP CHECKPOINT**

### Wednesday, Oct 29 (Day 3) - FINAL DEADLINE 10:59 PM CT

**Goal: Recording + Multi-Track + Polish**

- Complete PR #7 (Screen Recording)
- Complete PR #8 (Webcam Recording)
- Complete PR #9 (Multi-Track & Split)
- Complete PR #10 (Polish & Packaging)
- Record demo video
- **SUBMIT FINAL PROJECT**

---

## Priority Matrix

### MUST HAVE (MVP - Tuesday)

- ✅ PR #1: Project Setup
- ✅ PR #2: FFmpeg Integration
- ✅ PR #3: Video Import
- ✅ PR #4: Video Player
- ✅ PR #5: Timeline UI
- ✅ PR #6: Trim & Export

### SHOULD HAVE (Wednesday)

- ✅ PR #7: Screen Recording
- ✅ PR #8: Webcam Recording
- ✅ PR #9: Multi-Track & Split
- ✅ PR #10: Polish & Packaging

### NICE TO HAVE (Stretch)

- ⭐ PR #11: Save/Load Projects
- ⭐ PR #12: Undo/Redo
- ⭐ PR #13: Transitions
- ⭐ PR #14: Text Overlays
- ⭐ PR #15: Real-Time PiP Recording

---

## Notes

- **Work sequentially:** Complete PRs in order (1→2→3→4→5→6 for MVP)
- **Test frequently:** After each PR, verify everything still works
- **Commit often:** Commit after completing each subtask or PR
- **Don't block on stretch goals:** If stuck, move to next core feature
- **Time management:** Allocate 8-10 hours per day over 3 days
- **Ask for help:** If stuck >1 hour on a bug, seek help or find workaround

---

## Success Checklist

Before submitting Tuesday (MVP):

- [ ] App launches without errors
- [ ] Can import video files (drag-drop and file picker)
- [ ] Clips display in media library with thumbnails
- [ ] Video player plays clips with audio
- [ ] Timeline shows imported clips
- [ ] Can trim clips by dragging handles
- [ ] Can export to MP4
- [ ] Packaged app available for download

Before submitting Wednesday (Final):

- [ ] Can record screen with source selection
- [ ] Can record webcam with preview
- [ ] Timeline supports 2-3 tracks
- [ ] Can split clips at playhead
- [ ] Can delete clips from timeline
- [ ] Multi-track export works (PiP overlay)
- [ ] All error messages are user-friendly
- [ ] App is polished and bug-free
- [ ] Demo video recorded (3-5 minutes)
- [ ] README with setup/build instructions
- [ ] Final packaged app uploaded with link
- [ ] All code pushed to GitHub

---

**Good luck! Ship fast, ship often, and remember: a working MVP beats a feature-rich app that doesn't work. 🚀**
