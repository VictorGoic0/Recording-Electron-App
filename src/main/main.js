const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  protocol,
  net,
  session,
  desktopCapturer,
} = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const {
  verifyFFmpegInstallation,
  getVideoMetadata,
  getVideoDuration,
  getVideoResolution,
  getFileSize,
  getCodecInfo,
  generateThumbnail,
  fixWebMDuration,
} = require("./services/ffmpegService");
const {
  exportSingleClip,
  exportMultipleClips,
} = require("./services/exportService");

let mainWindow;

// Register the custom protocol as a standard scheme before app is ready
// This is REQUIRED for protocol.handle() to work properly
protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-video",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true, // Required for video/audio streaming
      corsEnabled: false,
      bypassCSP: false,
    },
  },
]);

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
      webSecurity: true, // Keep security enabled
    },
  });

  // Load from Vite dev server in development, or from built files in production
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, the app structure is: app.asar/dist-renderer/index.html
    // __dirname in packaged app points to: app.asar/src/main
    // So we need to go up two levels and then into dist-renderer
    const indexPath = path.join(__dirname, "../../dist-renderer/index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Set Content Security Policy headers — dev allows Vite dev server, prod locks down to self
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const policy = isDev
      ? [
          "default-src 'self' http://localhost:3000 ws://localhost:3000;",
          "script-src 'self' http://localhost:3000;",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: blob: local-video:;",
          "media-src 'self' blob: local-video:;",
          "connect-src 'self' ws://localhost:3000 http://localhost:3000;",
        ].join(" ")
      : [
          "default-src 'self';",
          "script-src 'self';",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: blob: local-video:;",
          "media-src 'self' blob: local-video:;",
          "connect-src 'self';",
        ].join(" ");

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });

  // Register custom protocol for loading local video files securely
  // Using modern protocol.handle API (replaces deprecated registerFileProtocol)
  // Returns a Response object (fetch API standard) instead of using callbacks
  protocol.handle("local-video", (request) => {
    try {
      // Parse the URL to extract the path from query parameter
      // Format: local-video://load?path=C%3A%2FUsers%2Ffile.mp4
      const requestUrl = new URL(request.url);

      // Get the path from the query parameter
      const filePath = requestUrl.searchParams.get("path");

      if (!filePath) {
        console.error(
          "[Protocol] No path parameter provided in URL:",
          request.url
        );
        return new Response("Missing path parameter", {
          status: 400,
          headers: { "content-type": "text/plain" },
        });
      }

      // Verify file exists before serving
      if (!fs.existsSync(filePath)) {
        console.error("[Protocol] File not found:", filePath);
        return new Response("File not found", {
          status: 404,
          headers: { "content-type": "text/plain" },
        });
      }

      // Convert to file:// URL for net.fetch
      const normalizedPath = filePath.replace(/\\/g, "/");
      const fileUrl = normalizedPath.match(/^[a-zA-Z]:/)
        ? `file:///${normalizedPath}` // Windows: file:///C:/path
        : `file://${normalizedPath}`; // Unix: file:///path

      // Create a new request with the same headers to pass through range requests
      const fetchRequest = new Request(fileUrl, {
        headers: request.headers,
      });

      // Fetch and return the file
      return net.fetch(fetchRequest);
    } catch (error) {
      console.error("[Protocol] Error loading file:", error);
      return new Response(`Error loading file: ${error.message}`, {
        status: 500,
        headers: { "content-type": "text/plain" },
      });
    }
  });

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

// ============================================================================
// File System Operations
// ============================================================================

/**
 * Show file picker dialog for importing videos
 */
ipcMain.handle("show-open-dialog", async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import Video Files",
      buttonLabel: "Import",
      filters: [
        { name: "Videos", extensions: ["mp4", "mov", "webm"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
    });

    console.log("[IPC] File dialog result:", result);

    if (result.canceled) {
      return {
        success: false,
        canceled: true,
      };
    }

    return {
      success: true,
      filePaths: result.filePaths,
    };
  } catch (error) {
    console.error("[IPC] Failed to show open dialog:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Process imported video file - extract metadata and generate thumbnail
 */
ipcMain.handle("process-video-file", async (event, filePath) => {
  try {
    console.log("[IPC] Processing video file:", filePath);

    // Extract all metadata in parallel
    const [duration, resolution, fileSize, codecInfo, thumbnail] =
      await Promise.all([
        getVideoDuration(filePath),
        getVideoResolution(filePath),
        getFileSize(filePath),
        getCodecInfo(filePath),
        generateThumbnail(filePath, 1),
      ]);

    const filename = path.basename(filePath);

    return {
      success: true,
      data: {
        filePath,
        filename,
        duration,
        resolution,
        fileSize,
        codecInfo,
        thumbnail,
      },
    };
  } catch (error) {
    console.error("[IPC] Failed to process video file:", error);
    return {
      success: false,
      error: error.message,
      filePath,
    };
  }
});

/**
 * Reveal file in Explorer (Windows) or Finder (macOS)
 */
ipcMain.handle("reveal-in-explorer", async (event, filePath) => {
  try {
    console.log("[IPC] Revealing file in explorer:", filePath);
    shell.showItemInFolder(filePath);
    return {
      success: true,
    };
  } catch (error) {
    console.error("[IPC] Failed to reveal file:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// ============================================================================
// Export Operations
// ============================================================================

/**
 * Show save dialog for export
 */
ipcMain.handle("show-save-dialog", async (event) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Video",
      buttonLabel: "Export",
      defaultPath: "edited-video.mp4",
      filters: [
        { name: "MP4 Video", extensions: ["mp4"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled) {
      return {
        success: false,
        canceled: true,
      };
    }

    return {
      success: true,
      filePath: result.filePath,
    };
  } catch (error) {
    console.error("[IPC] Failed to show save dialog:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Export timeline to video
 */
ipcMain.handle("export-timeline", async (event, exportData) => {
  try {
    console.log("[IPC] Export timeline called");
    console.log("Export data:", JSON.stringify(exportData, null, 2));

    const { clips, outputPath, tracks } = exportData;

    if (!clips || clips.length === 0) {
      throw new Error("No clips to export");
    }

    // Create progress callback that sends events to renderer
    const sendProgress = (progress) => {
      event.sender.send("export-progress", { progress });
    };

    // Check if we have multi-track export (clips with track information)
    const hasMultipleTracks = clips.some(
      (clip) => clip.track && clip.track !== "main"
    );

    if (hasMultipleTracks && tracks) {
      // Multi-track export with overlay
      const { exportMultiTrack } = require("./services/exportService");
      await exportMultiTrack(tracks, outputPath, sendProgress);
    } else if (clips.length === 1) {
      // Single clip export
      const clip = clips[0];
      await exportSingleClip(
        clip.filePath,
        outputPath,
        clip.trimStart || 0,
        clip.trimEnd || clip.duration,
        sendProgress
      );
    } else {
      // Multiple clips export (concatenation)
      const clipData = clips.map((clip) => ({
        path: clip.filePath,
        trimStart: clip.trimStart || 0,
        trimEnd: clip.trimEnd || clip.duration,
      }));

      await exportMultipleClips(clipData, outputPath, sendProgress);
    }

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    console.error("[IPC] Export failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// ============================================================================
// Screen Recording Operations
// ============================================================================

/**
 * Get available desktop sources (screens and windows) for recording
 */
ipcMain.handle("get-desktop-sources", async (event, options = {}) => {
  try {
    console.log("[IPC] Getting desktop sources");

    const { types = ["screen", "window"] } = options;

    // Get screens and windows separately to properly categorize them
    const [screenSources, windowSources] = await Promise.all([
      desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 300, height: 200 },
      }),
      desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: 300, height: 200 },
      }),
    ]);

    // Format screen sources
    const formattedScreens = screenSources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      display_id: source.display_id,
      type: "screen",
    }));

    // Format window sources
    const formattedWindows = windowSources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      display_id: source.display_id,
      type: "window",
    }));

    // Combine both types
    const formattedSources = [...formattedScreens, ...formattedWindows];

    console.log(
      `[IPC] Found ${formattedScreens.length} screens and ${formattedWindows.length} windows`
    );

    return {
      success: true,
      sources: formattedSources,
    };
  } catch (error) {
    console.error("[IPC] Failed to get desktop sources:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Save screen recording to file
ipcMain.handle("save-recording", async (event, buffer, filename) => {
  try {
    console.log("[IPC] Saving recording:", filename);

    // Get the user's videos directory
    const videosPath = app.getPath("videos");
    const savePath = path.join(videosPath, filename);

    // Write the buffer to file
    await fs.promises.writeFile(savePath, Buffer.from(buffer));

    console.log("[IPC] Recording saved successfully:", savePath);

    // Fix WebM duration metadata if it's a WebM file
    if (filename.toLowerCase().endsWith(".webm")) {
      try {
        console.log("[IPC] Fixing WebM duration metadata...");
        await fixWebMDuration(savePath);
        console.log("[IPC] WebM duration metadata fixed");
      } catch (fixError) {
        console.warn(
          "[IPC] Failed to fix WebM duration (file still usable):",
          fixError.message
        );
        // Don't fail the entire operation if duration fix fails
      }
    }

    return {
      success: true,
      filePath: savePath,
    };
  } catch (error) {
    console.error("[IPC] Failed to save recording:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});
