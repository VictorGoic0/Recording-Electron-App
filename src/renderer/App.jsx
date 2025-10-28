import React, { useState, useEffect } from "react";
import "./App.css";
import MediaLibrary from "./components/MediaLibrary";
import { useMedia } from "./context/MediaContext";
import { v4 as uuidv4 } from "uuid";

function App() {
  const { clips, selectedClipId, addMultipleMedia, selectClip } = useMedia();
  const [isProcessing, setIsProcessing] = useState(false);

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
      }
    }
  };

  const processImportedFiles = async (filePaths) => {
    if (filePaths.length === 0) return;

    setIsProcessing(true);
    const newClips = [];
    const errors = [];

    console.log(`Processing ${filePaths.length} file(s)...`);

    for (const filePath of filePaths) {
      try {
        console.log(`Processing: ${filePath}`);
        
        // Process the video file using FFmpeg
        const result = await window.electron.fileSystem.processVideoFile(filePath);

        if (result.success) {
          // Create clip object with unique ID
          const clip = {
            id: uuidv4(),
            ...result.data,
          };

          newClips.push(clip);
          console.log(`✓ Successfully processed: ${clip.filename}`);
        } else {
          errors.push({ filePath, error: result.error });
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
      console.log(`✓ Added ${newClips.length} clip(s) to library`);
    }

    // Report errors if any
    if (errors.length > 0) {
      console.error(`Failed to process ${errors.length} file(s):`, errors);
      // TODO: Show error notification to user (in future subtask)
    }

    setIsProcessing(false);
  };

  const handleClipSelect = (clip) => {
    selectClip(clip.id);
    console.log("Clip selected:", clip);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>ClipCreate</h1>
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
            onClipSelect={handleClipSelect}
            selectedClipId={selectedClipId}
          />

          {/* Video Preview - Center Panel */}
          <section className="video-preview">
            <div className="panel-header">
              <h2>Preview</h2>
              <div className="preview-controls">
                <button className="btn-icon" title="Play/Pause">▶</button>
                <button className="btn-icon" title="Stop">⏹</button>
              </div>
            </div>
            <div className="preview-content">
              <div className="placeholder-content">
                <div className="placeholder-icon">🎬</div>
                <p>No video selected</p>
                <p className="placeholder-hint">
                  Select a clip from the media library
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Timeline - Bottom Panel */}
        <section className="timeline">
          <div className="panel-header">
            <h2>Timeline</h2>
            <div className="timeline-controls">
              <button className="btn-icon" title="Zoom In">+</button>
              <button className="btn-icon" title="Zoom Out">−</button>
              <button className="btn-secondary btn-small">Export</button>
            </div>
          </div>
          <div className="timeline-content">
            <div className="placeholder-content">
              <div className="placeholder-icon">📊</div>
              <p>Timeline is empty</p>
              <p className="placeholder-hint">
                Drag clips here to start editing
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
