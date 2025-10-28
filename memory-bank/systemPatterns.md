# System Patterns: ClipCreate

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Electron App (Desktop)                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐         ┌──────────────┐    │
│  │ Main Process │ ◄─────► │ IPC Channel  │    │
│  │              │         │              │    │
│  │ • Window Mgmt│         │ • Commands   │    │
│  │ • File I/O   │         │ • Progress   │    │
│  │ • FFmpeg     │         │ • Events     │    │
│  │ • Dialogs    │         │              │    │
│  └──────────────┘         └──────────────┘    │
│                                                  │
│  ┌──────────────┐         ┌──────────────┐    │
│  │ Renderer     │         │ React UI     │    │
│  │ Process      │         │              │    │
│  │              │         │ • Timeline   │    │
│  │ • React App  │         │ • Media Lib  │    │
│  │ • State Mgmt │         │ • Preview    │    │
│  │ • UI Events  │         │ • Controls   │    │
│  └──────────────┘         └──────────────┘    │
└─────────────────────────────────────────────────┘
```

## Component Hierarchy

### Main Process (Backend)

- **Window Management**: Create/manage Electron windows
- **File System**: Read/write operations, file validation
- **FFmpeg Service**: Video processing, export, metadata extraction
- **IPC Handlers**: Export, import, recording commands
- **Native APIs**: desktopCapturer, dialog

### Renderer Process (Frontend)

- **App Shell**: Main window container
- **Media Library Panel**: Import, clip grid, metadata
- **Video Preview**: HTML5 video player with controls
- **Timeline**: Multi-track editor with playhead
- **State Management**: React Context for app-wide state

## Data Flow Patterns

### Import Flow

```
User Action → IPC → Main Process → FFmpeg → Metadata → IPC → UI Update
```

### Timeline State

```javascript
{
  clips: [{ id, fileId, position, startTime, endTime, trimStart, trimEnd }],
  tracks: [{ id, clips: [] }],
  playhead: number,
  zoom: number,
  duration: number
}
```

### Export Flow

```
Timeline State → IPC → Main Process → FFmpeg Filter Chain → Encode → File Save
```

## Key Design Patterns

### IPC Communication

- **Unidirectional**: Renderer → Main for commands
- **Event-based**: Main → Renderer for progress/events
- **Async**: All operations non-blocking

### State Management

- **React Context**: App-wide timeline/media state
- **Local State**: Component-specific UI state
- **Derived State**: Computed values (total duration, zoom scale)

### FFmpeg Integration

- **Static Binary**: Bundled per platform
- **Wrapper Service**: fluent-ffmpeg abstraction
- **Path Resolution**: Platform-specific binary detection
- **Progress Parsing**: Extract % from FFmpeg output

## Module Organization

```
/src
  /main
    /services
      - ffmpegService.js
      - exportService.js
    main.js
  /renderer
    /components
      - MediaLibrary.jsx
      - VideoPlayer.jsx
      - Timeline.jsx
    /context
      - AppContext.jsx
    index.jsx
```

## Integration Points

- **File System ↔ UI**: IPC for import/export dialogs
- **FFmpeg ↔ Timeline**: Convert timeline state to FFmpeg filter commands
- **Recorder ↔ Media Library**: Auto-add recorded files
- **Player ↔ Timeline**: Bidirectional playhead sync

## Performance Considerations

- **Timeline Rendering**: Virtual rendering for 10+ clips
- **Preview Playback**: 30fps minimum, throttle updates
- **Export**: Progress updates every 1%
- **Memory**: Limit undo history, dispose unused resources
