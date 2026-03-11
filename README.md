# ClipForge

A powerful desktop video editing application built with Electron, React, and FFmpeg. ClipForge allows you to import videos, record your screen or webcam, edit on a multi-track timeline, and export professional-quality videos.

## Features

- **Video Import**: Drag-and-drop or browse to import MP4, MOV, and WebM files
- **Screen Recording**: Record your screen with audio
- **Webcam Recording**: Record from your webcam with customizable settings
- **Multi-Track Timeline**: Main track plus two overlay tracks for picture-in-picture effects
- **Video Editing**:
  - Trim clips with visual handles
  - Split clips at playhead position (Ctrl/Cmd+K)
  - Arrange clips across multiple tracks
  - Real-time preview with synchronized playback
- **Export**: High-quality H.264/AAC video export with progress tracking
- **Keyboard Shortcuts**: Efficient editing with keyboard controls

## System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 (Mojave) or later
- **Linux**: Major distributions (Ubuntu 20.04+, Fedora, etc.)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for application, additional space for video files
- **Node.js**: 18.x or later (for development)

## Development Setup

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (version 18.x or later)
2. Install [Git](https://git-scm.com/)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ClipForge
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

This will start both the Vite dev server (port 3000, for React hot reloading) and the Electron app.

### Development Scripts

- `npm run dev` — Start development mode with hot reloading
- `npm run build` — Build and package the app for distribution
- `npm run build:renderer` — Build only the React frontend
- `npm start` — Start Electron app (without Vite dev server)

## Building for Production

```bash
npm run build
```

This command will:

1. Build the React frontend with Vite
2. Package the Electron app with electron-builder
3. Include FFmpeg binaries for your platform
4. Create an installer in the `dist/` directory

### Platform-Specific Builds

The build process automatically creates an installer for your current platform:

- **Windows**: `.exe` installer (NSIS) — `ClipForge Setup X.X.X.exe`
- **macOS**: `.dmg` disk image — `ClipForge-X.X.X.dmg`
- **Linux**: AppImage — `ClipForge-X.X.X.AppImage`

**Output location**: `dist/`

### Testing the Built App

**Windows**:
```bash
.\dist\win-unpacked\ClipForge.exe
```

**macOS**:
```bash
open dist/mac/ClipForge.app
```

**Linux**:
```bash
./dist/linux-unpacked/clipforge
```

## Keyboard Shortcuts

| Shortcut                  | Action                             |
| ------------------------- | ---------------------------------- |
| `Spacebar` or `K`         | Play / Pause video                 |
| `Delete` or `Backspace`   | Delete selected clip from timeline |
| `Ctrl+K` (`Cmd+K` on Mac) | Split clip at playhead position    |
| `Left Arrow`              | Skip backward 10 seconds           |
| `Right Arrow`             | Skip forward 10 seconds            |
| `Up Arrow`                | Increase volume by 10%             |
| `Down Arrow`              | Decrease volume by 10%             |

_Access the full list by clicking the "Help" button in the app._

## Project Structure

```
ClipForge/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js           # Main entry point, IPC handlers, CSP
│   │   ├── preload.js        # Preload script (IPC bridge)
│   │   └── services/
│   │       ├── ffmpegService.js
│   │       └── exportService.js
│   └── renderer/             # React frontend
│       ├── App.jsx           # Root component
│       ├── index.jsx         # React DOM entry
│       ├── store/            # Zustand global state
│       │   ├── mediaStore.js     # Media library state
│       │   └── playbackStore.js  # Playback & timeline state
│       ├── components/       # React components
│       └── hooks/            # Custom React hooks (recording)
├── resources/
│   └── ffmpeg/               # FFmpeg binaries (platform-specific)
│       ├── linux/
│       ├── mac/
│       └── win/
├── dist/                     # Built application (generated)
├── dist-renderer/            # Built React app (generated)
├── package.json
└── vite.config.js
```

## Architecture

### Main Process (Electron)

- Window management and app lifecycle
- Content Security Policy enforcement (via `session.webRequest`)
- File system operations (import, export, dialogs)
- FFmpeg integration for video processing
- IPC handlers for renderer communication

### Renderer Process (React + Zustand)

State is managed by two Zustand stores — no React Context providers:

| Store | Responsibility |
|---|---|
| `useMediaStore` | Media library — clips list, selected clip |
| `usePlaybackStore` | Playback session — playhead (absolute seconds), duration, play state, timeline tracks |

UI-only state (toasts, modals, volume) stays local to components.

- Video preview and synchronized multi-track playback
- Timeline editing (trim, split, drag & drop)
- Recording management (screen/webcam)

### IPC Communication

Secure communication via the preload bridge (`window.electron`). Handles: video import/processing, export, recording save, file dialogs.

### FFmpeg Integration

Bundled platform binaries for: metadata extraction, thumbnail generation, single/multi-clip export, multi-track overlay compositing, WebM duration fix.

## Known Limitations

- Export resolution is fixed at 1080p (1920×1080)
- Overlay tracks are positioned at fixed corners (bottom-right, bottom-left)
- Maximum recommended clips on timeline: ~20 for optimal performance
- Supported import formats: MP4, MOV, WebM only

## Troubleshooting

### App won't start in development mode

- Ensure Node.js 18.x or later is installed
- Delete `node_modules` and run `npm install` again
- Check that port 3000 (Vite) is not already in use

### FFmpeg not found error

- FFmpeg binaries should be in `resources/ffmpeg/win/`, `resources/ffmpeg/mac/`, or `resources/ffmpeg/linux/`
- For production builds, electron-builder includes them automatically via `extraResources`

### Export fails

- Ensure source video files haven't been moved or deleted
- Check available disk space
- Verify FFmpeg binary is accessible

### Recording permissions denied

- **Windows**: Allow camera/microphone access in Settings → Privacy & Security
- **macOS**: Grant permissions in System Preferences → Security & Privacy
- **Linux**: Ensure PipeWire or PulseAudio is running; check `xdg-desktop-portal` for screen capture

## Technologies

- **Electron** — Desktop app framework
- **React 18** — UI framework
- **Zustand** — Global state management
- **Vite** — Frontend build tool and dev server
- **FFmpeg** — Video processing (bundled binaries)
- **fluent-ffmpeg** — FFmpeg Node.js wrapper
- **electron-builder** — App packaging and distribution

## License

ISC
