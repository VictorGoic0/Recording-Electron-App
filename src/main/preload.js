const { contextBridge, ipcRenderer, webUtils } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,

  // Utility functions
  utils: {
    /**
     * Get file path from File object (needed for drag-and-drop in Electron)
     * @param {File} file - File object from drag-and-drop
     * @returns {string} Full file system path
     */
    getPathForFile: (file) => webUtils.getPathForFile(file),
  },

  // File system operations
  fileSystem: {
    /**
     * Show file picker dialog for importing videos
     * @returns {Promise<{success: boolean, filePaths?: string[], canceled?: boolean, error?: string}>}
     */
    showOpenDialog: () => ipcRenderer.invoke("show-open-dialog"),

    /**
     * Process video file and extract metadata
     * @param {string} filePath - Path to video file
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    processVideoFile: (filePath) =>
      ipcRenderer.invoke("process-video-file", filePath),

    /**
     * Reveal file in Explorer (Windows) or Finder (macOS)
     * @param {string} filePath - Path to file
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    revealInExplorer: (filePath) =>
      ipcRenderer.invoke("reveal-in-explorer", filePath),
  },

  // FFmpeg operations
  ffmpeg: {
    /**
     * Get complete video information
     * @param {string} filePath - Path to video file
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    getVideoInfo: (filePath) => ipcRenderer.invoke("get-video-info", filePath),

    /**
     * Generate thumbnail from video
     * @param {string} filePath - Path to video file
     * @param {number} timestamp - Timestamp in seconds (default: 1)
     * @returns {Promise<{success: boolean, data?: string, error?: string}>}
     */
    generateThumbnail: (filePath, timestamp = 1) =>
      ipcRenderer.invoke("generate-thumbnail", filePath, timestamp),

    /**
     * Get video metadata
     * @param {string} filePath - Path to video file
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    getMetadata: (filePath) =>
      ipcRenderer.invoke("get-video-metadata", filePath),

    /**
     * Get video duration
     * @param {string} filePath - Path to video file
     * @returns {Promise<{success: boolean, data?: number, error?: string}>}
     */
    getDuration: (filePath) =>
      ipcRenderer.invoke("get-video-duration", filePath),

    /**
     * Get video resolution
     * @param {string} filePath - Path to video file
     * @returns {Promise<{success: boolean, data?: {width: number, height: number}, error?: string}>}
     */
    getResolution: (filePath) =>
      ipcRenderer.invoke("get-video-resolution", filePath),
  },
});
