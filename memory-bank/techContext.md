# Technical Context: ClipForge

## Technology Stack

### Core Framework

- **Electron**: Desktop application framework
  - Version: Latest stable
  - Purpose: Main/renderer process architecture
  - Key APIs: desktopCapturer, IPC, dialog, file system, session (CSP)

### Frontend

- **React**: UI framework
  - Version: 18.x
  - Purpose: Component-based UI
  - Hooks: useState, useEffect, useRef, useCallback
- **Zustand**: Global state management
  - Version: ^5.0.11
  - Purpose: Replaces React Context for shared state
  - Stores: `useMediaStore`, `usePlaybackStore`

### Media Processing

- **FFmpeg**: Video processing engine
  - Distribution: Static binary (macOS/Windows)
  - Wrapper: fluent-ffmpeg
  - Location: `/resources/ffmpeg/` (platform-specific)
  - Operations: Encode, decode, filter, metadata extraction

### Build & Package

- **Vite + @vitejs/plugin-react**: Renderer build and dev server (port 3000)
- **electron-builder**: Application packaging
  - Targets: macOS .dmg, Windows .exe
  - Extra Resources: FFmpeg binaries

### Development Tools

- **concurrently**: Run main + renderer processes in dev
- **electron-builder**: Distribution packaging

## Dependencies

### Core

```json
{
  "electron": "latest",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "zustand": "^5.0.11",
  "fluent-ffmpeg": "^2.1.2",
  "uuid": "^9.0.0"
}
```

### Dev

```json
{
  "electron-builder": "latest",
  "concurrently": "^8.0.0",
  "vite": "latest",
  "@vitejs/plugin-react": "latest"
}
```

## Development Setup

### Prerequisites

- Node.js 18+ (npm)
- Git for version control
- Windows 10+ or macOS for testing

### Installation

```bash
npm install
npm run dev    # Start development mode (Vite on :3000 + Electron)
npm run build  # Build renderer for production
npm run package  # Create distributable
```

### Project Structure

```
clipforge/
├── src/
│   ├── main/               # Electron main process
│   │   ├── main.js         # IPC handlers, window management, CSP
│   │   └── services/
│   │       ├── ffmpegService.js
│   │       └── exportService.js
│   └── renderer/           # React renderer process
│       ├── store/
│       │   ├── mediaStore.js      # useMediaStore (Zustand)
│       │   └── playbackStore.js   # usePlaybackStore (Zustand)
│       ├── components/
│       ├── hooks/
│       ├── App.jsx
│       └── index.jsx
├── ZUSTAND_REFACTOR.md     # Architecture decisions TDD
├── tasks-zustand.md        # Refactor task tracking
└── package.json
```

## Technical Constraints

### Platform Support

- **Primary**: Windows 10+
- **Secondary**: macOS 10.14+

### File Format Support

- **Import**: MP4, MOV, WebM
- **Export**: MP4 (H.264 video, AAC audio)

### Security

- CSP enforced via `session.defaultSession.webRequest.onHeadersReceived`
- Dev policy: allows `localhost:3000` and `unsafe-inline` for Vite HMR
- Production policy: strict `'self'` only, `blob:` and `local-video:` explicitly allowed
- `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`

## Key Technical Decisions

### State Management

- **Pattern**: Zustand (migrated from React Context, March 2026)
- **Two stores**: `useMediaStore` (library) + `usePlaybackStore` (playback + timeline)
- **Playhead representation**: Absolute seconds (NOT normalized 0–1 fraction)
  - Rationale: Eliminates duration split-brain bug — no multiplication by a separately-stored duration
- **`setCurrentTime` is atomic**: Writes both `currentTime` and `playhead` in one store update (Phase 2)

### Custom Protocol

- `local-video://` registered as privileged scheme in main process
- Videos loaded via `local-video://load?path=<encoded>` — avoids Windows drive-letter URL parsing issues
- Bypasses Electron file:// security restrictions safely

### IPC Pattern

- **Commands**: `ipcRenderer.invoke()` for async calls (via preload bridge)
- **Events**: `ipcRenderer.on()` for progress/updates
- **Validation**: Error handling on both sides
