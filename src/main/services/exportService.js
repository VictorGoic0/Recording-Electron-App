const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const { ffmpeg: fluentFFmpeg } = require("./ffmpegService");

/**
 * Export Service - Handles video export using FFmpeg
 * Builds FFmpeg commands and executes them with progress tracking
 */

/**
 * Export a single clip with trim points
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to save output file
 * @param {number} trimStart - Start time in seconds
 * @param {number} trimEnd - End time in seconds
 * @param {Function} onProgress - Progress callback (progress: number 0-100)
 * @returns {Promise<string>} Path to exported file
 */
async function exportSingleClip(
  inputPath,
  outputPath,
  trimStart,
  trimEnd,
  onProgress
) {
  return new Promise((resolve, reject) => {
    console.log("[Export Service] Starting single clip export:");
    console.log("  Input:", inputPath);
    console.log("  Output:", outputPath);
    console.log("  Trim:", `${trimStart}s to ${trimEnd}s`);

    // Validate inputs
    if (!inputPath || !outputPath) {
      reject(new Error("Export failed: Input and output paths are required"));
      return;
    }

    if (trimStart < 0 || trimEnd < 0 || trimEnd <= trimStart) {
      reject(new Error("Export failed: Invalid trim points"));
      return;
    }

    // Check if input file exists
    const fs = require("fs");
    if (!fs.existsSync(inputPath)) {
      reject(new Error(`Export failed: Source file not found: ${inputPath}`));
      return;
    }

    // Build FFmpeg command with stderr output for progress parsing
    let command = fluentFFmpeg(inputPath);

    // Enable stderr output for better progress tracking
    command.on("stderr", (stderrLine) => {
      // fluent-ffmpeg doesn't parse stderr by default for progress
      // We rely on the progress event which uses frames/time info
    });

    // Apply trimming: seek to start and set duration
    const duration = trimEnd - trimStart;
    command
      .seekInput(trimStart) // Seek to start of trimmed section
      .duration(duration) // Set output duration
      .videoCodec("libx264") // H.264 codec
      .audioCodec("aac") // AAC audio
      .videoBitrate("5000k") // Good quality for 1080p
      .audioBitrate("192k") // Good quality audio
      .format("mp4")
      .outputOptions([
        "-preset slow", // Good balance of speed/quality
        "-crf 23", // Good quality setting
      ])
      .output(outputPath);

    // Track progress
    command.on("progress", (progress) => {
      if (onProgress && typeof onProgress === "function") {
        // Calculate percentage based on processed time vs total duration
        // progress.timemark is in format "00:00:01.23" (HH:MM:SS.mmm)
        let percent = 0;

        if (progress.timemark) {
          const timeParts = progress.timemark.split(":");
          const hours = parseInt(timeParts[0]) || 0;
          const minutes = parseInt(timeParts[1]) || 0;
          const seconds = parseFloat(timeParts[2]) || 0;
          const processedTime = hours * 3600 + minutes * 60 + seconds;
          percent = Math.min(100, Math.round((processedTime / duration) * 100));
        } else if (progress.frames) {
          // Fallback: rough estimate based on frames processed
          // This is less accurate but better than nothing
          const estimatedTotal = Math.round(duration * 30); // Assume 30 fps
          percent = Math.min(
            99,
            Math.round((progress.frames / estimatedTotal) * 100)
          );
        }

        onProgress(percent);
      }
    });

    // Handle completion
    command.on("end", () => {
      console.log("[Export Service] Export completed successfully");
      resolve(outputPath);
    });

    // Handle errors
    command.on("error", (error, stdout, stderr) => {
      console.error("[Export Service] Export failed:", error);
      console.error("[Export Service] FFmpeg stderr:", stderr);

      // Parse error message to be more user-friendly
      let errorMessage = "Export failed: ";

      if (error.message) {
        errorMessage += error.message;
      } else if (stderr) {
        // Extract meaningful error from FFmpeg stderr
        const errorMatch = stderr.match(/error (\w+): (.+)/i);
        if (errorMatch) {
          errorMessage += errorMatch[2];
        } else {
          errorMessage += "FFmpeg processing error";
        }
      } else {
        errorMessage += "Unknown error occurred";
      }

      reject(new Error(errorMessage));
    });

    // Start export
    command.run();
  });
}

/**
 * Export multiple clips concatenated together
 * @param {Array<{path: string, trimStart: number, trimEnd: number}>} clips - Array of clip info
 * @param {string} outputPath - Path to save output file
 * @param {Function} onProgress - Progress callback (progress: number 0-100)
 * @returns {Promise<string>} Path to exported file
 */
async function exportMultipleClips(clips, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    console.log("[Export Service] Starting multi-clip export:");
    console.log("  Clips:", clips.length);
    console.log("  Output:", outputPath);

    if (!clips || clips.length === 0) {
      reject(new Error("Export failed: No clips to export"));
      return;
    }

    // Validate all source files exist
    const fs = require("fs");
    const os = require("os");
    const missingFiles = clips.filter((clip) => !fs.existsSync(clip.path));
    if (missingFiles.length > 0) {
      reject(
        new Error(
          `Export failed: Source files not found: ${missingFiles
            .map((c) => c.path)
            .join(", ")}`
        )
      );
      return;
    }

    // For MVP, we'll use the concat demuxer approach
    // First, we need to trim each clip and save to temp files
    const tempDir = os.tmpdir();

    async function processAllClips() {
      const tempFiles = [];

      // Trim each clip and save to temp file
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const tempPath = path.join(tempDir, `clip-${i}-${Date.now()}.mp4`);

        try {
          await exportSingleClip(
            clip.path,
            tempPath,
            clip.trimStart || 0,
            clip.trimEnd || 999999, // Use a large value if no trim
            (progress) => {
              // Progress for this specific clip
              const clipProgress = (i / clips.length) * 100;
              const totalProgress = clipProgress + progress / clips.length;
              if (onProgress) onProgress(Math.min(100, totalProgress));
            }
          );
          tempFiles.push(tempPath);
        } catch (error) {
          console.error(`[Export Service] Failed to process clip ${i}:`, error);
          // Clean up temp files
          tempFiles.forEach((tempFile) => {
            try {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            } catch (e) {
              console.error(
                "[Export Service] Failed to clean up temp file:",
                tempFile
              );
            }
          });
          reject(error);
          return;
        }
      }

      // Create concat file for FFmpeg
      const concatFile = path.join(tempDir, `concat-${Date.now()}.txt`);
      const concatContent = tempFiles
        .map((file) => `file '${file}'`)
        .join("\n");
      fs.writeFileSync(concatFile, concatContent);

      // Now concatenate all temp files
      fluentFFmpeg()
        .input(concatFile)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .videoCodec("libx264")
        .audioCodec("aac")
        .videoBitrate("5000k")
        .audioBitrate("192k")
        .format("mp4")
        .outputOptions(["-preset slow", "-crf 23"])
        .output(outputPath)
        .on("progress", (progress) => {
          if (onProgress) {
            const percent = Math.min(100, Math.round(progress.percent || 90));
            onProgress(percent);
          }
        })
        .on("end", () => {
          console.log("[Export Service] Multi-clip export completed");

          // Clean up temp files
          tempFiles.forEach((tempFile) => {
            try {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            } catch (e) {
              console.error(
                "[Export Service] Failed to clean up temp file:",
                tempFile
              );
            }
          });

          try {
            if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
          } catch (e) {
            console.error(
              "[Export Service] Failed to clean up concat file:",
              concatFile
            );
          }

          resolve(outputPath);
        })
        .on("error", (error, stdout, stderr) => {
          console.error("[Export Service] Concatenation failed:", error);
          console.error("[Export Service] FFmpeg stderr:", stderr);

          // Clean up temp files
          tempFiles.forEach((tempFile) => {
            try {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            } catch (e) {
              console.error(
                "[Export Service] Failed to clean up temp file:",
                tempFile
              );
            }
          });

          try {
            if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
          } catch (e) {
            console.error(
              "[Export Service] Failed to clean up concat file:",
              concatFile
            );
          }

          reject(error);
        })
        .run();
    }

    processAllClips();
  });
}

/**
 * Generate FFmpeg export command for debugging
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path to output video
 * @param {number} trimStart - Start time in seconds
 * @param {number} trimEnd - End time in seconds
 * @returns {string} FFmpeg command string
 */
function generateFFmpegCommand(inputPath, outputPath, trimStart, trimEnd) {
  const duration = trimEnd - trimStart;

  return `ffmpeg -i "${inputPath}" -ss ${trimStart} -t ${duration} -c:v libx264 -c:a aac -b:v 5000k -b:a 192k -preset slow -crf 23 "${outputPath}"`;
}

/**
 * Export multi-track timeline with overlays
 * @param {Array} tracks - Array of track objects with clips
 * @param {string} outputPath - Path to save output file
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Path to exported file
 */
async function exportMultiTrack(tracks, outputPath, onProgress) {
  return new Promise((resolve, reject) => {
    console.log("[Export Service] Starting multi-track export with overlays");

    if (!tracks || tracks.length === 0) {
      reject(new Error("Export failed: No tracks to export"));
      return;
    }

    // Get tracks
    const mainTrack = tracks.find((t) => t.id === "main");
    const overlayTrack = tracks.find((t) => t.id === "overlay");
    const overlay2Track = tracks.find((t) => t.id === "overlay2");

    // For MVP: Only support single clip per track
    const mainClip = mainTrack?.clips[0];
    const overlayClip = overlayTrack?.clips[0];
    const overlay2Clip = overlay2Track?.clips[0];

    if (!mainClip) {
      reject(new Error("Export failed: No main track clip found"));
      return;
    }

    // Start with main clip
    let command = fluentFFmpeg(mainClip.filePath);

    // Apply main clip trim
    if (mainClip.trimStart || mainClip.trimEnd) {
      const duration =
        (mainClip.trimEnd || mainClip.duration) - (mainClip.trimStart || 0);
      command.seekInput(mainClip.trimStart || 0).duration(duration);
    }

    // Build complex filter for overlays
    let filterComplex = [];
    let hasOverlays = false;

    // Add overlay inputs if they exist
    if (overlayClip) {
      command.input(overlayClip.filePath);
      hasOverlays = true;
    }

    if (overlay2Clip) {
      command.input(overlay2Clip.filePath);
      hasOverlays = true;
    }

    if (hasOverlays) {
      let currentOutput = "[0:v]";
      let filterIndex = 1;

      if (overlayClip) {
        // Scale overlay to 25% width (320px for 1280px source)
        // Position at bottom-right with 20px margin
        filterComplex.push(
          `[${filterIndex}:v]scale=iw*0.25:-1[overlay${filterIndex}]`,
          `${currentOutput}[overlay${filterIndex}]overlay=main_w-overlay_w-20:main_h-overlay_h-80[out${filterIndex}]`
        );
        currentOutput = `[out${filterIndex}]`;
        filterIndex++;
      }

      if (overlay2Clip) {
        // Scale overlay2 to 25% width
        // Position at bottom-left with 20px margin
        filterComplex.push(
          `[${filterIndex}:v]scale=iw*0.25:-1[overlay${filterIndex}]`,
          `${currentOutput}[overlay${filterIndex}]overlay=20:main_h-overlay_h-80[out${filterIndex}]`
        );
        currentOutput = `[out${filterIndex}]`;
        filterIndex++;
      }

      // Apply complex filter
      command.complexFilter(filterComplex, currentOutput);
    }

    // Output settings
    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .videoBitrate("5000k")
      .audioBitrate("192k")
      .format("mp4")
      .outputOptions(["-preset slow", "-crf 23"])
      .output(outputPath);

    // Track progress
    command.on("progress", (progress) => {
      if (onProgress && typeof onProgress === "function") {
        let percent = 0;
        if (progress.percent) {
          percent = Math.min(100, Math.round(progress.percent));
        } else if (progress.timemark) {
          // Fallback: calculate from timemark
          const timeParts = progress.timemark.split(":");
          const hours = parseInt(timeParts[0]) || 0;
          const minutes = parseInt(timeParts[1]) || 0;
          const seconds = parseFloat(timeParts[2]) || 0;
          const processedTime = hours * 3600 + minutes * 60 + seconds;
          const totalDuration = mainClip.duration || 60;
          percent = Math.min(
            100,
            Math.round((processedTime / totalDuration) * 100)
          );
        }
        onProgress(percent);
      }
    });

    // Handle completion
    command.on("end", () => {
      console.log("[Export Service] Multi-track export completed");
      resolve(outputPath);
    });

    // Handle errors
    command.on("error", (error, stdout, stderr) => {
      console.error("[Export Service] Multi-track export failed:", error);
      console.error("[Export Service] FFmpeg stderr:", stderr);
      reject(new Error(`Multi-track export failed: ${error.message}`));
    });

    // Start export
    command.run();
  });
}

module.exports = {
  exportSingleClip,
  exportMultipleClips,
  exportMultiTrack,
  generateFFmpegCommand,
};
