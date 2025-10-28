const path = require("path");
const { app } = require("electron");
const ffmpeg = require("fluent-ffmpeg");

/**
 * FFmpeg Service - Handles FFmpeg binary path resolution and configuration
 * Supports both development and production environments
 */

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

/**
 * Get the FFmpeg binary path based on platform and environment
 * @returns {string} Path to ffmpeg binary
 */
function getFFmpegPath() {
  const platform = process.platform;
  let ffmpegBinary;

  if (platform === "win32") {
    ffmpegBinary = "ffmpeg.exe";
  } else if (platform === "darwin") {
    ffmpegBinary = "ffmpeg";
  } else {
    // Linux or other platforms
    ffmpegBinary = "ffmpeg";
  }

  if (isDev) {
    // In development, use local resources folder
    const platformFolder = platform === "win32" ? "win" : "mac";
    return path.join(
      process.cwd(),
      "resources",
      "ffmpeg",
      platformFolder,
      ffmpegBinary
    );
  } else {
    // In production, use bundled resources
    return path.join(process.resourcesPath, "ffmpeg", ffmpegBinary);
  }
}

/**
 * Get the FFprobe binary path based on platform and environment
 * @returns {string} Path to ffprobe binary
 */
function getFFprobePath() {
  const platform = process.platform;
  let ffprobeBinary;

  if (platform === "win32") {
    ffprobeBinary = "ffprobe.exe";
  } else if (platform === "darwin") {
    ffprobeBinary = "ffprobe";
  } else {
    ffprobeBinary = "ffprobe";
  }

  if (isDev) {
    // In development, use local resources folder
    const platformFolder = platform === "win32" ? "win" : "mac";
    return path.join(
      process.cwd(),
      "resources",
      "ffmpeg",
      platformFolder,
      ffprobeBinary
    );
  } else {
    // In production, use bundled resources
    return path.join(process.resourcesPath, "ffmpeg", ffprobeBinary);
  }
}

/**
 * Initialize FFmpeg with correct binary paths
 * @returns {object} Configured fluent-ffmpeg instance
 */
function initializeFFmpeg() {
  const ffmpegPath = getFFmpegPath();
  const ffprobePath = getFFprobePath();

  console.log("[FFmpeg Service] FFmpeg path:", ffmpegPath);
  console.log("[FFmpeg Service] FFprobe path:", ffprobePath);

  // Set the paths for fluent-ffmpeg
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);

  return ffmpeg;
}

/**
 * Verify FFmpeg installation and get version
 * @returns {Promise<string>} FFmpeg version string
 */
function verifyFFmpegInstallation() {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath();
    const { exec } = require("child_process");

    exec(`"${ffmpegPath}" -version`, (error, stdout, stderr) => {
      if (error) {
        console.error("[FFmpeg Service] FFmpeg verification failed:", error);
        reject(new Error("FFmpeg binary not found or not executable"));
        return;
      }

      const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : "unknown";
      console.log("[FFmpeg Service] FFmpeg verified, version:", version);
      resolve(version);
    });
  });
}

/**
 * Get metadata from a video file
 * @param {string} filePath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        console.error("[FFmpeg Service] Failed to get metadata:", error);
        reject(error);
        return;
      }
      resolve(metadata);
    });
  });
}

/**
 * Extract duration from video file in seconds
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} Duration in seconds
 */
async function getVideoDuration(filePath) {
  const metadata = await getVideoMetadata(filePath);
  return metadata.format.duration || 0;
}

/**
 * Extract resolution from video file
 * @param {string} filePath - Path to video file
 * @returns {Promise<{width: number, height: number}>} Video resolution
 */
async function getVideoResolution(filePath) {
  const metadata = await getVideoMetadata(filePath);
  const videoStream = metadata.streams.find(
    (stream) => stream.codec_type === "video"
  );

  if (!videoStream) {
    throw new Error("No video stream found");
  }

  return {
    width: videoStream.width,
    height: videoStream.height,
  };
}

/**
 * Get file size in bytes
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} File size in bytes
 */
async function getFileSize(filePath) {
  const metadata = await getVideoMetadata(filePath);
  return metadata.format.size || 0;
}

/**
 * Get codec information
 * @param {string} filePath - Path to video file
 * @returns {Promise<{video: string, audio: string}>} Codec information
 */
async function getCodecInfo(filePath) {
  const metadata = await getVideoMetadata(filePath);
  const videoStream = metadata.streams.find(
    (stream) => stream.codec_type === "video"
  );
  const audioStream = metadata.streams.find(
    (stream) => stream.codec_type === "audio"
  );

  return {
    video: videoStream ? videoStream.codec_name : "none",
    audio: audioStream ? audioStream.codec_name : "none",
  };
}

// Initialize FFmpeg on module load
initializeFFmpeg();

module.exports = {
  ffmpeg,
  getFFmpegPath,
  getFFprobePath,
  initializeFFmpeg,
  verifyFFmpegInstallation,
  getVideoMetadata,
  getVideoDuration,
  getVideoResolution,
  getFileSize,
  getCodecInfo,
};
