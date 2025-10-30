# ClipForge

A powerful desktop video editing application built with Electron, React, and FFmpeg. ClipForge allows you to import videos, record your screen or webcam, edit on a multi-track timeline, and export professional-quality videos.

## Features

- **Video Import**: Drag-and-drop or browse to import MP4, MOV, and WebM files
- **Screen Recording**: Record your screen with audio
- **Webcam Recording**: Record from your webcam with customizable settings
- **Multi-Track Timeline**: Main track plus two overlay tracks for picture-in-picture effects
- **Video Editing**:
  - Trim clips with visual handles
  - Split clips at playhead position
  - Arrange clips across multiple tracks
  - Real-time preview with synchronized playback
- **Export**: High-quality H.264/AAC video export with progress tracking
- **Keyboard Shortcuts**: Efficient editing with keyboard controls

## System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 (Mojave) or later
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for application, additional space for video files
- **Node.js**: 16.x or later (for development)

## Development Setup

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (version 16.x or later)
2. Install [Git](https://git-scm.com/)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd "Week 3 - Desktop Editing App"
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

This will start both the Vite dev server (for React hot reloading) and the Electron app.

### Development Scripts

- `npm run dev` - Start development mode with hot reloading
- `npm run build` - Build and package the app for distribution
- `npm run build:renderer` - Build only the React frontend
- `npm start` - Start Electron app (without Vite dev server)

## Building for Production

### Build the Application

To create a distributable version of ClipForge:

```bash
npm run build
```

This command will:

1. Build the React frontend with Vite
2. Package the Electron app with electron-builder
3. Include FFmpeg binaries for your platform
4. Create an installer in the `dist/` directory

### Platform-Specific Builds

The build process automatically creates installers for your current platform:

- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image

**Output Location**: `dist/`

**Built Artifacts**:

- Windows: `ClipForge Setup X.X.X.exe`
- macOS: `ClipForge-X.X.X.dmg`
- Unpacked directory: `dist/win-unpacked/` or `dist/mac/`

### Testing the Built App

After building, you can test the packaged app:

**Windows**:

```bash
.\dist\win-unpacked\ClipForge.exe
```

**macOS**:

```bash
open dist/mac/ClipForge.app
```

## Keyboard Shortcuts

| Shortcut                  | Action                             |
| ------------------------- | ---------------------------------- |
| `Spacebar`                | Play / Pause video                 |
| `Delete` or `Backspace`   | Delete selected clip from timeline |
| `Ctrl+K` (`Cmd+K` on Mac) | Split clip at playhead position    |
| `Left Arrow`              | Skip backward 10 seconds           |
| `Right Arrow`             | Skip forward 10 seconds            |
| `Up Arrow`                | Increase volume by 10%             |
| `Down Arrow`              | Decrease volume by 10%             |

_Access the full list by clicking the "Help" button in the app._

## Project Structure

```
Week 3 - Desktop Editing App/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.js          # Main entry point
│   │   ├── preload.js       # Preload script for IPC
│   │   └── services/        # Backend services
│   │       ├── ffmpegService.js
│   │       └── exportService.js
│   ├── renderer/             # React frontend
│   │   ├── App.jsx          # Main app component
│   │   ├── components/      # React components
│   │   ├── context/         # React context providers
│   │   └── hooks/           # Custom React hooks
├── resources/
│   └── ffmpeg/              # FFmpeg binaries (platform-specific)
├── dist/                    # Built application (generated)
├── dist-renderer/           # Built React app (generated)
├── package.json
└── vite.config.js
```

## Architecture

### Main Process (Electron)

- Window management and app lifecycle
- File system operations (import, export)
- FFmpeg integration for video processing
- IPC handlers for renderer communication

### Renderer Process (React)

- User interface and interactions
- Timeline state management
- Video preview and playback
- Recording management (screen/webcam)

### IPC Communication

- Secure communication between main and renderer processes
- Handles: video import, export, recording, file dialogs

### FFmpeg Integration

- Bundled FFmpeg binaries for video processing
- Metadata extraction (duration, resolution, codecs)
- Thumbnail generation
- Video export with filters and overlays

## Known Limitations

- Export resolution is fixed at 1080p (1920x1080)
- Overlay tracks are positioned at fixed corners (bottom-right, bottom-left)
- Maximum recommended clips on timeline: ~20 for optimal performance
- Supported import formats: MP4, MOV, WebM only
- WebM recordings may have minor duration inaccuracies (corrected during export)

## Troubleshooting

### App won't start in development mode

- Ensure Node.js 16.x or later is installed
- Delete `node_modules` and run `npm install` again
- Check that ports 5173 (Vite) and Electron are not in use

### FFmpeg not found error

- FFmpeg binaries should be in `resources/ffmpeg/win/` or `resources/ffmpeg/mac/`
- For development, ensure binaries are present
- For production builds, electron-builder automatically includes them

### Export fails

- Ensure source video files haven't been moved or deleted
- Check available disk space
- Verify FFmpeg binary is accessible

### Recording permissions denied

- **Windows**: Allow camera/microphone access in Windows Settings > Privacy
- **macOS**: Grant permissions in System Preferences > Security & Privacy

## Technologies Used

- **Electron**: Desktop app framework
- **React**: UI framework
- **Vite**: Frontend build tool
- **FFmpeg**: Video processing
- **fluent-ffmpeg**: FFmpeg Node.js wrapper
- **electron-builder**: App packaging

## License

ISC

## Support

For issues or questions, please check the troubleshooting section above or refer to the project documentation.
