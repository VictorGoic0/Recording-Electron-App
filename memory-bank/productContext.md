# Product Context: ClipCreate

## What It Is

ClipCreate is a desktop video editor focused on screen and webcam recording workflows. It enables users to create professional-looking videos through an intuitive timeline interface without cloud dependencies.

## Why It Exists

Built as a 72-hour sprint challenge to demonstrate:

- Desktop app development with Electron
- Video processing with FFmpeg
- Complex UI state management (timeline editor)
- Native API integration (screen capture, file system)
- Professional development workflow under tight deadlines

## Problems It Solves

1. **Quick Screen Recording**: Record desktop activity for tutorials, demos
2. **Webcam Overlays**: Add personal presence to screen recordings
3. **Local Editing**: Edit videos offline without internet
4. **Simple Workflow**: Import → Arrange → Trim → Export in minutes

## Target Users

- Content creators needing quick screen recordings
- Educators recording tutorials
- Anyone wanting to combine screen + webcam footage
- Users wanting local-first video editing

## Core User Journey

1. **Record**: Capture screen or webcam (with 3-2-1 countdown)
2. **Import**: Drag videos or pick from file system
3. **Arrange**: Drag clips onto timeline tracks
4. **Edit**: Trim clips, split, position on multi-track timeline
5. **Preview**: Real-time preview of composition
6. **Export**: Save as MP4 with progress tracking

## Design Philosophy

- **Clarity**: Obvious what each control does
- **Feedback**: Visual confirmation for all actions
- **Performance**: UI never freezes, show loading states
- **Familiarity**: Layout inspired by Premiere/Final Cut
- **Reliability**: Local-first, no network dependencies

## Unique Differentiators

- Bundled FFmpeg for native performance
- Real-time multi-track preview
- Simultaneous screen + webcam recording (stretch goal)
- No backend/cloud required
- Complete local file operation
