# FFmpeg Binaries Setup

This directory contains FFmpeg static binaries for different platforms.

## Download Instructions

### Windows

- Download from: https://www.gyan.dev/ffmpeg/builds/
- Get the "ffmpeg-release-essentials.zip" build
- Extract and copy `ffmpeg.exe` to `resources/ffmpeg/win/`

### macOS

- Download from: https://evermeet.cx/ffmpeg/
- Get the latest FFmpeg build
- Extract and copy `ffmpeg` binary to `resources/ffmpeg/mac/`

## Automatic Download (Windows)

For Windows, we'll download automatically using PowerShell.

## Required Files

After setup, you should have:

- `resources/ffmpeg/win/ffmpeg.exe` (Windows)
- `resources/ffmpeg/mac/ffmpeg` (macOS)

These binaries will be bundled with the app during the build process.
