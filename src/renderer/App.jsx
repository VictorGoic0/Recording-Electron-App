import React, { useState, useEffect } from "react";
import "./App.css";
import MediaLibrary from "./components/MediaLibrary";
import VideoPlayer from "./components/VideoPlayer";
import Timeline from "./components/Timeline";
import Toast from "./components/Toast";
import { useMedia } from "./context/MediaContext";
import { useTimeline } from "./context/TimelineContext";
import { v4 as uuidv4 } from "uuid";

function App() {
  const { clips, selectedClipId, selectedClip, addMultipleMedia, selectClip, removeMedia } = useMedia();
  const { playhead, setPlayhead, tracks, zoom, selectedTimelineClip } = useTimeline();
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast notification helper
  const showToast = (message, type = "info") => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Prevent default drag-and-drop behavior on the entire app
  // This prevents files from opening in the Electron window
  useEffect(() => {
    const preventDefaults = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    // Prevent drag and drop on document level
    document.addEventListener("dragover", preventDefaults);
    document.addEventListener("drop", preventDefaults);

    return () => {
      document.removeEventListener("dragover", preventDefaults);
      document.removeEventListener("drop", preventDefaults);
    };
  }, []);

  const handleImport = async (files) => {
    console.log("Import requested:", files);
    
    // If no files provided (button click), show file picker
    if (!files) {
      const result = await window.electron.fileSystem.showOpenDialog();
      
      if (result.success && result.filePaths) {
        console.log("Files selected from dialog:", result.filePaths);
        await processImportedFiles(result.filePaths);
      } else if (result.canceled) {
        console.log("File selection canceled");
      } else if (result.error) {
        console.error("Error opening file dialog:", result.error);
        showToast("Failed to open file dialog", "error");
      }
    } else {
      // Files from drag-and-drop - extract file paths
      // Use Electron's webUtils to get the real file path from File objects
      console.log("File objects received:", files);
      
      const filePaths = files
        .map((file) => {
          try {
            // Use webUtils.getPathForFile() to get the actual file path
            const filePath = window.electron.utils.getPathForFile(file);
            console.log(`File: ${file.name}, path: ${filePath}`);
            return filePath;
          } catch (error) {
            console.error(`Failed to get path for file ${file.name}:`, error);
            return null;
          }
        })
        .filter((path) => path !== null && path !== undefined && path !== "");
      
      console.log("Extracted file paths:", filePaths);
      
      if (filePaths.length > 0) {
        await processImportedFiles(filePaths);
      } else {
        console.error("No valid file paths found in dropped files");
        showToast("No valid video files found", "warning");
      }
    }
  };

  const processImportedFiles = async (filePaths) => {
    if (filePaths.length === 0) return;

    setIsProcessing(true);
    const newClips = [];
    const errors = [];
    const unsupportedFiles = [];

    console.log(`Processing ${filePaths.length} file(s)...`);

    for (const filePath of filePaths) {
      try {
        // Check file extension
        const ext = filePath.toLowerCase().split(".").pop();
        if (!["mp4", "mov", "webm"].includes(ext)) {
          unsupportedFiles.push(filePath);
          console.warn(`✗ Unsupported format: ${filePath}`);
          continue;
        }

        console.log(`Processing: ${filePath}`);
        
        // Process the video file using FFmpeg
        const result = await window.electron.fileSystem.processVideoFile(filePath);

        if (result.success) {
          // Create clip object with unique ID
          const clip = {
            id: uuidv4(),
            ...result.data,
          };

          // Log detailed clip information for debugging
          console.log(`✓ Successfully processed: ${clip.filename}`, {
            duration: clip.duration,
            durationType: typeof clip.duration,
            durationIsFinite: isFinite(clip.duration),
            resolution: clip.resolution,
            fileSize: clip.fileSize
          });

          newClips.push(clip);
        } else {
          // Check if it's a corrupted file error
          if (result.error.includes("Invalid data") || result.error.includes("moov atom not found")) {
            errors.push({ filePath, error: "File appears to be corrupted or incomplete" });
          } else {
            errors.push({ filePath, error: result.error });
          }
          console.error(`✗ Failed to process: ${filePath}`, result.error);
        }
      } catch (error) {
        errors.push({ filePath, error: error.message });
        console.error(`✗ Exception processing: ${filePath}`, error);
      }
    }

    // Add all successfully processed clips to state using context
    if (newClips.length > 0) {
      addMultipleMedia(newClips);
      showToast(`Successfully imported ${newClips.length} video${newClips.length > 1 ? "s" : ""}`, "success");
      console.log(`✓ Added ${newClips.length} clip(s) to library`);
    }

    // Report unsupported files
    if (unsupportedFiles.length > 0) {
      showToast(
        `${unsupportedFiles.length} file(s) skipped. Unsupported format. Please use MP4, MOV, or WebM`,
        "warning"
      );
    }

    // Report errors
    if (errors.length > 0) {
      console.error(`Failed to process ${errors.length} file(s):`, errors);
      const errorMessage = errors.length === 1
        ? `Failed to import "${errors[0].filePath.split(/[\\/]/).pop()}": ${errors[0].error}`
        : `Failed to import ${errors.length} file(s). Check console for details.`;
      showToast(errorMessage, "error");
    }

    setIsProcessing(false);
  };

  const handleClipSelect = (clip) => {
    selectClip(clip.id);
    console.log("Clip selected:", clip);
  };

  const handleRemoveClip = (clipId) => {
    const clip = clips.find((c) => c.id === clipId);
    if (clip) {
      console.log("Removing clip from library:", clip.filename);
      removeMedia(clipId);
    }
  };

  const handleRevealInExplorer = async (filePath) => {
    if (!filePath) {
      console.error("No file path provided");
      return;
    }
    
    try {
      await window.electron.fileSystem.revealInExplorer(filePath);
      console.log("Revealed file in explorer:", filePath);
    } catch (error) {
      console.error("Failed to reveal file in explorer:", error);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>ClipForge</h1>
          <span className="version">v1.0.0</span>
          {isProcessing && (
            <span className="processing-indicator">
              ⏳ Processing videos...
            </span>
          )}
        </div>
        <div className="header-right">
          <button className="btn-secondary btn-small">Help</button>
        </div>
      </header>

      <div className="main-content">
        <div className="top-section">
          {/* Media Library - Left Panel */}
          <MediaLibrary
            clips={clips}
            onImport={handleImport}
            onProcessFiles={processImportedFiles}
            onClipSelect={handleClipSelect}
            selectedClipId={selectedClipId}
            onRemoveClip={handleRemoveClip}
            onRevealInExplorer={handleRevealInExplorer}
            isProcessing={isProcessing}
          />

          {/* Video Preview - Center Panel */}
          <VideoPlayer 
            selectedMediaClip={selectedClip}
            selectedTimelineClip={selectedTimelineClip}
            tracks={tracks}
            playhead={playhead}
            onShowToast={showToast}
            onCurrentTimeChange={setPlayhead}
            timelinePlayhead={playhead}
          />
        </div>

        {/* Timeline - Bottom Panel */}
        <section className="timeline">
          <Timeline playhead={playhead} onPlayheadChange={setPlayhead} />
        </section>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
