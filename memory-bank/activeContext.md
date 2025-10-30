# Active Context: ClipCreate

## Current Work Focus

**Phase**: Final Features (Wednesday Deadline)
**Date**: October 30, 2025
**Current PR**: PR #8 - Webcam Recording (2/7 subtasks complete, working on #3-4)

## What I'm Working On Right Now

MVP is complete! PRs #1-6 fully functional. Screen recording (PR #7) is complete with all features working. Currently implementing webcam recording with camera selection and MediaRecorder setup complete.

**Current Status:**

- Full video editing pipeline working (import, timeline, trim, export)
- Screen recording with source selection, audio, pause/resume fully functional
- Webcam recording partially complete - camera selection and MediaRecorder setup done
- WebM duration metadata fix applied (FFmpeg post-processing)
- Error boundary preventing app crashes
- All recordings auto-import to media library

## Recent Changes (PR #7 & #8)

**PR #7 - Screen Recording (COMPLETE):**

- Screen source picker with thumbnails (separate Screens/Windows sections)
- MediaRecorder with VP9/VP8 codec support
- Recording controls (Start/Stop/Pause/Resume, timer)
- Microphone audio toggle with visual feedback
- Auto-save to Videos folder with timestamp filenames
- FFmpeg post-processing to fix WebM duration metadata
- Auto-import to media library with thumbnails
- Error handling and toast notifications

**PR #8 - Webcam Recording (IN PROGRESS - 2/7 complete):**

- ✅ Camera picker with live previews
- ✅ MediaRecorder setup with getUserMedia
- ✅ Combined webcam video + microphone audio
- ✅ Dynamic filename generation
- 🔄 Working on: Webcam preview before recording (subtask 3)
- 🔄 Working on: Recording controls consistency (subtask 4)

**Major Bug Fixes:**

- Fixed "NaN" duration display (parse strings, validate finite numbers)
- Fixed WebM duration metadata (FFmpeg remux)
- Created ErrorBoundary component
- Fixed cleanup effect dependencies
- Removed problematic useCallback wrappers

## Immediate Next Steps

1. **Subtask 3**: Show webcam preview before recording starts
2. **Subtask 4**: Ensure recording controls match screen recording flow
3. **Remaining PR #8 subtasks**: Error handling polish, camera settings (stretch)
4. **PR #9**: Multi-track timeline and split functionality
5. **PR #10**: Final polish and packaging

## Active Decisions

- **Recording Pattern**: Separate hooks for screen vs webcam, shared UI controls
- **Duration Fix**: Post-process all WebM files with FFmpeg remux
- **Error Strategy**: Toast notifications + Error Boundary for crashes
- **Codec Priority**: VP9 → VP8 → WebM fallback
- **File Organization**: Separate filenames for screen vs webcam recordings

## Blockers/Challenges

- None currently
- Recording features progressing smoothly

## Active Files

- `src/renderer/components/MediaLibrary.jsx` - Recording UI and controls
- `src/renderer/hooks/useWebcamRecording.js` - Webcam recording logic
- `src/renderer/hooks/useScreenRecording.js` - Screen recording logic
- `src/renderer/components/CameraPicker.jsx` - Camera selection modal
- `src/main/services/ffmpegService.js` - Video processing and duration fix
- `tasks.md` - Progress tracking

## Current Priorities

1. **Complete PR #8** - Webcam recording (subtasks 3-7)
2. **PR #9** - Multi-track & split (Wednesday deadline)
3. **PR #10** - Polish & packaging
4. **Demo Video** - Showcase all features
