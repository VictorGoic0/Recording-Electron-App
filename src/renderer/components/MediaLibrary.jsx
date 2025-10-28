import React, { useState } from "react";
import "./MediaLibrary.css";

/**
 * MediaLibrary Component
 * Displays imported video clips in a grid layout with thumbnails
 * Handles file import via button click or drag-and-drop
 */
function MediaLibrary({ clips = [], onImport, onClipSelect, selectedClipId }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleImportClick = () => {
    if (onImport) {
      onImport();
    }
  };

  const handleClipClick = (clip) => {
    if (onClipSelect) {
      onClipSelect(clip);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    // Handle dropped files
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0 && onImport) {
      onImport(files);
    }
  };

  return (
    <aside className="media-library">
      <div className="panel-header">
        <h2>Media Library</h2>
        <button className="btn-primary" onClick={handleImportClick}>
          + Import
        </button>
      </div>

      <div
        className={`library-content ${isDragging ? "dragging" : ""}`}
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
      </div>
    </aside>
  );
}

/**
 * ClipCard Component
 * Individual clip card showing thumbnail, filename, and metadata
 */
function ClipCard({ clip, isSelected, onClick }) {
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

  return (
    <div
      className={`clip-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
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

