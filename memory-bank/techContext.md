# Technical Context: ClipForge

## Technology Stack

### Core Framework

- **Electron**: Desktop application framework
  - Version: Latest stable
  - Purpose: Main/renderer process architecture
  - Key APIs: desktopCapturer, IPC, dialog, file system

### Frontend

- **React**: UI framework
  - Version: 18.x
  - Purpose: Component-based UI, state management
  - Hooks: useState, useEffect, useContext, useRef

### Media Processing

- **FFmpeg**: Video processing engine
  - Distribution: Static binary (macOS/Windows)
  - Wrapper: fluent-ffmpeg
  - Location: `/resources/ffmpeg/` (platform-specific)
  - Operations: Encode, decode, filter, metadata extraction

### Build & Package

- **electron-builder**: Application packaging
  - Targets: macOS .dmg, Windows .exe
  - Extra Resources: FFmpeg binaries
  - Configuration: package.json build section

### Development Tools

- **concurrently**: Run main + renderer processes in dev
- **react-dev-utils**: Hot module reloading
- **electron-builder**: Distribution packaging

## Dependencies

### Core

```json
{
  "electron": "latest",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "fluent-ffmpeg": "^2.1.2"
}
```

### Dev

```json
{
  "electron-builder": "latest",
  "concurrently": "^8.0.0",
  "@electron/rebuild": "latest"
}
```

### Optional

```json
{
  "react-dnd": "^16.0.0",
  "uuid": "^9.0.0",
  "react-toastify": "^9.0.0"
}
```

## Development Setup

### Prerequisites

- Node.js 16+ (npm/yarn)
- Git for version control
- macOS or Windows for testing

### Installation

```bash
npm install
npm run dev  # Start development mode
npm run build  # Build for production
npm run package  # Create distributable
```

### Project Structure

```
clipforge/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js
│   │   └── services/
│   │       ├── ffmpegService.js
│   │       └── exportService.js
│   ├── renderer/       # React renderer process
│   │   ├── components/
│   │   ├── context/
│   │   └── index.jsx
│   └── resources/      # Static resources
│       └── ffmpeg/     # FFmpeg binaries
├── package.json
├── electron-builder.yml
└── PRD.md
```

## Technical Constraints

### Platform Support

- **Primary**: macOS 10.14+
- **Secondary**: Windows 10+
- **Note**: Single build supports one platform

### File Format Support

- **Import**: MP4, MOV, WebM
- **Export**: MP4 (H.264 video, AAC audio)
- **Excluded**: AVI, MKV, WMV

### Performance Targets

- **App Launch**: <5 seconds
- **Preview Playback**: 30fps minimum
- **Export Time**: ~1-2 minutes for 2-minute video at 1080p
- **Memory**: Stable with 10+ clips on timeline

### Browser/API Limitations

- **MediaRecorder**: Codec support varies by platform
- **desktopCapturer**: Electron-only, requires permissions
- **File System**: Sandboxed, IPC required for access

## Key Technical Decisions

### FFmpeg Bundling

- **Static Binaries**: Platform-specific builds
- **Path**: Auto-detect from `process.resourcesPath`
- **Alternative**: Use @ffmpeg-installer/ffmpeg if bundling fails

### State Management

- **Pattern**: React Context (lightweight)
- **Alternative**: Zustand or Redux if complexity grows
- **Persistence**: File-based projects (stretch goal)

### Timeline Rendering

- **Approach**: DOM-based (simpler to start)
- **Alternative**: HTML5 Canvas if performance issues
- **Performance**: Virtual rendering for 10+ clips

### IPC Pattern

- **Commands**: `ipcRenderer.invoke()` for async calls
- **Events**: `ipcRenderer.on()` for progress/updates
- **Validation**: Error handling on both sides

## Development Workflow

### Hot Reload

- **Renderer**: React hot reload enabled
- **Main**: Restart required for changes
- **DevTools**: Available in development mode

### Debugging

- **Main Process**: Console logs to terminal
- **Renderer**: Chrome DevTools
- **IPC**: Electron DevTools protocol

### Testing

- **Manual**: Test import/export/recording workflows
- **Automated**: None (MVP scope)
- **Platforms**: Test on target OS before packaging

## Known Technical Risks

1. **FFmpeg Complexity**: Filter chains for multi-track export
2. **Recording Permissions**: Electron screen capture requires user permission
3. **Codec Compatibility**: MediaRecorder format varies
4. **File Size Limits**: Large imports may slow processing
5. **Timeline Performance**: 10+ clips may lag without virtualization
