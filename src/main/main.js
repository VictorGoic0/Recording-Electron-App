const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const { verifyFFmpegInstallation } = require("./services/ffmpegService");

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
