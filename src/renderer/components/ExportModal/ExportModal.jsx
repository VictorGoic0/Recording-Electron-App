import React from "react";
import "./ExportModal.css";

/**
 * Export Modal Component
 * Shows export progress with percentage, time remaining, and cancel button
 */
function ExportModal({ isOpen, progress, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="export-modal-overlay">
      <div className="export-modal">
        <h2>Exporting Video</h2>
        <div className="export-progress-container">
          <div className="export-progress-bar">
            <div
              className="export-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="export-progress-text">
            {Math.round(progress)}%
          </div>
        </div>
        <p className="export-status">
          Processing video... Please wait.
        </p>
        <button className="export-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ExportModal;

