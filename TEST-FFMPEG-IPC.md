# FFmpeg IPC Testing Guide

## Testing the FFmpeg IPC Communication

To test that the FFmpeg IPC handlers are working correctly, follow these steps:

### Option 1: Use the Test HTML Page

1. Temporarily update `src/main/main.js` to load the test page:

   ```javascript
   // In development mode, replace:
   mainWindow.loadURL("http://localhost:3000");
   // With:
   mainWindow.loadFile(path.join(__dirname, "../../test-ipc-ffmpeg.html"));
   ```

2. Run the app:

   ```bash
   npm run dev:electron
   ```

3. Use the test page to:
   - Select a video file
   - Click the test buttons to verify each IPC handler
   - Check the console for results

### Option 2: Test from React App

Once you have the React app running, you can call the FFmpeg methods from any component:

```javascript
// Example: Get video info
const handleFileSelect = async (filePath) => {
  const result = await window.electron.ffmpeg.getVideoInfo(filePath);

  if (result.success) {
    console.log("Video info:", result.data);
    console.log("Duration:", result.data.duration);
    console.log("Resolution:", result.data.resolution);
  } else {
    console.error("Error:", result.error);
  }
};

// Example: Generate thumbnail
const handleGenerateThumbnail = async (filePath) => {
  const result = await window.electron.ffmpeg.generateThumbnail(filePath, 1);

  if (result.success) {
    // result.data is a base64 data URL
    setThumbnailSrc(result.data);
  }
};
```

## Available IPC Methods

All methods are available via `window.electron.ffmpeg`:

- `getVideoInfo(filePath)` - Get complete video information
- `generateThumbnail(filePath, timestamp?)` - Generate thumbnail at timestamp
- `getMetadata(filePath)` - Get raw FFmpeg metadata
- `getDuration(filePath)` - Get video duration in seconds
- `getResolution(filePath)` - Get video resolution {width, height}

## Expected Results

All methods return a promise that resolves to:

```javascript
{
  success: boolean,
  data?: any,      // On success
  error?: string   // On failure
}
```

## Cleanup

After testing, remember to:

1. Restore the original loadURL in main.js
2. Delete test-ipc-ffmpeg.html (or keep for future testing)
