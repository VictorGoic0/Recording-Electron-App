import React, { useState } from "react";
import "./MediaLibrary.css";
import ScreenSourcePicker from "./ScreenSourcePicker";

/**
 * MediaLibrary Component
 * Displays imported video clips in a grid layout with thumbnails
 * Handles file import via button click or drag-and-drop
 */
function MediaLibrary({ 
  clips = [], 
  onImport, 
  onClipSelect, 
  selectedClipId,
  onRemoveClip,
  onRevealInExplorer,
  isProcessing = false
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isRecordDropdownOpen, setIsRecordDropdownOpen] = useState(false);
  const [isScreenSourcePickerOpen, setIsScreenSourcePickerOpen] = useState(false);

  const handleImportClick = () => {
    if (onImport) {
      onImport();
    }
  };

  const handleRecordClick = (event) => {
    event.stopPropagation();
    setIsRecordDropdownOpen(!isRecordDropdownOpen);
  };

  const handleRecordOptionSelect = (option) => {
    console.log("Record option selected:", option);
    setIsRecordDropdownOpen(false);
    
    if (option === "screen") {
      setIsScreenSourcePickerOpen(true);
    } else if (option === "webcam") {
      // TODO: Implement webcam recording
      console.log("Webcam recording not yet implemented");
    } else if (option === "both") {
      // TODO: Implement both screen and webcam recording
      console.log("Both screen and webcam recording not yet implemented");
    }
  };

  const handleScreenSourceSelect = (source) => {
    console.log("Screen source selected:", source);
    setIsScreenSourcePickerOpen(false);
    // TODO: Start recording with selected source
  };

  const handleScreenSourcePickerClose = () => {
    setIsScreenSourcePickerOpen(false);
  };

  const handleClipClick = (clip) => {
    if (onClipSelect) {
      onClipSelect(clip);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only show drop indicator if files are being dragged
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only hide drop indicator when leaving the component entirely
    // Check if the related target is outside the library content
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    // Handle dropped files
    const files = Array.from(event.dataTransfer.files);
    
    // Filter for video files only
    const videoFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      return ["mp4", "mov", "webm"].includes(ext);
    });

    if (videoFiles.length > 0 && onImport) {
      onImport(videoFiles);
    } else if (files.length > 0 && videoFiles.length === 0) {
      console.warn("No supported video files found. Supported formats: MP4, MOV, WebM");
    }
  };

  const handleContextMenu = (event, clip) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      clip,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleRemoveClick = () => {
    if (contextMenu && onRemoveClip) {
      onRemoveClip(contextMenu.clip.id);
    }
    closeContextMenu();
  };

  const handleRevealClick = () => {
    if (contextMenu && onRevealInExplorer) {
      onRevealInExplorer(contextMenu.clip.filePath);
    }
    closeContextMenu();
  };

  // Close context menu when clicking anywhere
  React.useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Close record dropdown when clicking outside
  React.useEffect(() => {
    if (isRecordDropdownOpen) {
      const handleClick = (event) => {
        const target = event.target;
        if (!target.closest('.record-button-container')) {
          setIsRecordDropdownOpen(false);
        }
      };
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [isRecordDropdownOpen]);

  return (
    <aside className="media-library">
      <div className="panel-header">
        <h2>Media Library</h2>
        <div className="header-buttons">
          <div className="record-button-container">
            <button 
              className="btn-record" 
              onClick={handleRecordClick}
              disabled={isProcessing}
              title="Record screen, webcam, or both"
            >
              <span className="record-icon"></span>
              <span>Record</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            {isRecordDropdownOpen && (
              <div className="record-dropdown">
                <div 
                  className="record-dropdown-item" 
                  onClick={() => handleRecordOptionSelect("screen")}
                >
                  <span className="dropdown-icon">🖥️</span>
                  <span>Screen</span>
                </div>
                <div 
                  className="record-dropdown-item" 
                  onClick={() => handleRecordOptionSelect("webcam")}
                >
                  <span className="dropdown-icon">📹</span>
                  <span>Webcam</span>
                </div>
                <div 
                  className="record-dropdown-item" 
                  onClick={() => handleRecordOptionSelect("both")}
                >
                  <span className="dropdown-icon">🎬</span>
                  <span>Both</span>
                </div>
              </div>
            )}
          </div>
          <button 
            className="btn-primary" 
            onClick={handleImportClick}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "+ Import"}
          </button>
        </div>
      </div>

      <div
        className={`library-content ${isDragging ? "dragging" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {clips.length === 0 ? (
          <div className="placeholder-content">
            <div className="placeholder-icon">📁</div>
            <p>No media files yet</p>
            <p className="placeholder-hint">
              Import videos or drag & drop files here
            </p>
          </div>
        ) : (
          <div className="clips-grid">
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                isSelected={clip.id === selectedClipId}
                onClick={() => handleClipClick(clip)}
                onContextMenu={(e) => handleContextMenu(e, clip)}
              />
            ))}
          </div>
        )}

        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-overlay-content">
              <div className="drop-icon">📥</div>
              <p>Drop videos here to import</p>
            </div>
          </div>
        )}

        {contextMenu && (
          <div
            className="context-menu"
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-item" onClick={handleRevealClick}>
              <span className="context-menu-icon">📁</span>
              <span>Reveal in {window.electron.platform === 'darwin' ? 'Finder' : 'Explorer'}</span>
            </div>
            <div className="context-menu-divider"></div>
            <div className="context-menu-item danger" onClick={handleRemoveClick}>
              <span className="context-menu-icon">🗑️</span>
              <span>Remove from Library</span>
            </div>
          </div>
        )}
      </div>

      {/* Screen Source Picker Modal */}
      <ScreenSourcePicker
        isOpen={isScreenSourcePickerOpen}
        onSelect={handleScreenSourceSelect}
        onClose={handleScreenSourcePickerClose}
      />
    </aside>
  );
}

/**
 * ClipCard Component
 * Individual clip card showing thumbnail, filename, and metadata
 */
function ClipCard({ clip, isSelected, onClick, onContextMenu }) {
  const [isDragging, setIsDragging] = React.useState(false);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(clip));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`clip-card ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={clip.filename}
    >
      <div className="clip-thumbnail">
        {clip.thumbnail ? (
          <img src={clip.thumbnail} alt={clip.filename} />
        ) : (
          <div className="thumbnail-placeholder">
            <span>🎬</span>
          </div>
        )}
        {clip.duration && (
          <div className="duration-badge">{formatDuration(clip.duration)}</div>
        )}
      </div>

      <div className="clip-info">
        <div className="clip-filename" title={clip.filename}>
          {clip.filename}
        </div>
        {clip.resolution && (
          <div className="clip-metadata">
            <span className="metadata-item">
              {clip.resolution.width}×{clip.resolution.height}
            </span>
            {clip.fileSize && (
              <span className="metadata-item">
                {formatFileSize(clip.fileSize)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaLibrary;

