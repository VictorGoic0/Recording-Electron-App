const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const {
  verifyFFmpegInstallation,
  getVideoMetadata,
  getVideoDuration,
  getVideoResolution,
  getFileSize,
  getCodecInfo,
  generateThumbnail,
} = require("./services/ffmpegService");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load from Vite dev server in development, or from built files in production
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
  }

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  // Verify FFmpeg installation on startup
  try {
    const version = await verifyFFmpegInstallation();
    console.log(`[Main] FFmpeg initialized successfully (version: ${version})`);
  } catch (error) {
    console.error("[Main] FFmpeg initialization failed:", error);
    // Continue anyway - we'll handle errors when FFmpeg is actually needed
  }

  createWindow();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============================================================================
// IPC Handlers for FFmpeg Operations
// ============================================================================

/**
 * Get complete video information (metadata, duration, resolution, etc.)
 */
ipcMain.handle("get-video-info", async (event, filePath) => {
  try {
    console.log("[IPC] Getting video info for:", filePath);

    const [metadata, duration, resolution, fileSize, codecInfo] =
      await Promise.all([
        getVideoMetadata(filePath),
        getVideoDuration(filePath),
        getVideoResolution(filePath),
        getFileSize(filePath),
        getCodecInfo(filePath),
      ]);

    return {
      success: true,
      data: {
        filePath,
        duration,
        resolution,
        fileSize,
        codecInfo,
        metadata,
      },
    };
  } catch (error) {
    console.error("[IPC] Failed to get video info:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Generate thumbnail from video file
 */
ipcMain.handle("generate-thumbnail", async (event, filePath, timestamp = 1) => {
  try {
    console.log(
      "[IPC] Generating thumbnail for:",
      filePath,
      "at",
      timestamp,
      "seconds"
    );

    const thumbnail = await generateThumbnail(filePath, timestamp);

    return {
      success: true,
      data: thumbnail,
    };
  } catch (error) {
    console.error("[IPC] Failed to generate thumbnail:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Get video metadata only
 */
ipcMain.handle("get-video-metadata", async (event, filePath) => {
  try {
    console.log("[IPC] Getting metadata for:", filePath);

    const metadata = await getVideoMetadata(filePath);

    return {
      success: true,
      data: metadata,
    };
  } catch (error) {
    console.error("[IPC] Failed to get metadata:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Get video duration
 */
ipcMain.handle("get-video-duration", async (event, filePath) => {
  try {
    const duration = await getVideoDuration(filePath);
    return {
      success: true,
      data: duration,
    };
  } catch (error) {
    console.error("[IPC] Failed to get duration:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Get video resolution
 */
ipcMain.handle("get-video-resolution", async (event, filePath) => {
  try {
    const resolution = await getVideoResolution(filePath);
    return {
      success: true,
      data: resolution,
    };
  } catch (error) {
    console.error("[IPC] Failed to get resolution:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});
