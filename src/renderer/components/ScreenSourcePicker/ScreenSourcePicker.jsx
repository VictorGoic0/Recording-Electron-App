import React, { useState, useEffect } from "react";
import "./ScreenSourcePicker.css";

/**
 * ScreenSourcePicker Component
 * Modal that displays available screen/window sources for recording
 * Shows thumbnails and allows user to select a source
 */
function ScreenSourcePicker({ isOpen, onSelect, onClose }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSourceId, setSelectedSourceId] = useState(null);

  // Separate sources into screens and windows based on type property
  const screens = sources.filter((source) => source.type === "screen");
  const windows = sources.filter((source) => source.type === "window");

  useEffect(() => {
    if (isOpen) {
      loadDesktopSources();
    } else {
      // Reset state when modal closes
      setSources([]);
      setError(null);
      setSelectedSourceId(null);
    }
  }, [isOpen]);

  const loadDesktopSources = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electron.recording.getDesktopSources({
        types: ["screen", "window"],
      });

      if (result.success) {
        setSources(result.sources);
      } else {
        setError(result.error || "Failed to load desktop sources");
      }
    } catch (err) {
      console.error("Error loading desktop sources:", err);
      setError(err.message || "Failed to load desktop sources");
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSelect = (sourceId) => {
    setSelectedSourceId(sourceId);
  };

  const handleConfirm = () => {
    if (selectedSourceId) {
      const selectedSource = sources.find(
        (source) => source.id === selectedSourceId
      );
      if (selectedSource) {
        onSelect(selectedSource);
      }
    }
  };

  const renderSourceGrid = (sourceList) => {
    if (sourceList.length === 0) return null;

    return (
      <div className="screen-source-picker-grid">
        {sourceList.map((source) => (
          <div
            key={source.id}
            className={`screen-source-item ${
              selectedSourceId === source.id ? "selected" : ""
            }`}
            onClick={() => handleSourceSelect(source.id)}
          >
            <div className="screen-source-thumbnail">
              <img src={source.thumbnail} alt={source.name} />
              {selectedSourceId === source.id && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
            <div className="screen-source-name">{source.name}</div>
          </div>
        ))}
      </div>
    );
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="screen-source-picker-overlay" onClick={handleCancel}>
      <div
        className="screen-source-picker-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="screen-source-picker-header">
          <h2>Select Screen or Window</h2>
          <button
            className="screen-source-picker-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="screen-source-picker-content">
          {loading && (
            <div className="screen-source-picker-loading">
              <div className="loading-spinner"></div>
              <p>Loading available sources...</p>
            </div>
          )}

          {error && (
            <div className="screen-source-picker-error">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button
                className="btn-retry"
                onClick={loadDesktopSources}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && sources.length === 0 && (
            <div className="screen-source-picker-empty">
              <p>No sources available</p>
            </div>
          )}

          {!loading && !error && sources.length > 0 && (
            <div className="screen-source-sections">
              {screens.length > 0 && (
                <div className="screen-source-section">
                  <h3 className="screen-source-section-title">Screens</h3>
                  {renderSourceGrid(screens)}
                </div>
              )}

              {windows.length > 0 && (
                <div className="screen-source-section">
                  <h3 className="screen-source-section-title">Windows</h3>
                  {renderSourceGrid(windows)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="screen-source-picker-footer">
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!selectedSourceId}
          >
            Select Source
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScreenSourcePicker;

