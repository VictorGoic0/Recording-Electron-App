import React, { useState } from "react";
import "./App.css";
import MediaLibrary from "./components/MediaLibrary";

function App() {
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);

  const handleImport = (files) => {
    console.log("Import requested:", files);
    // TODO: Implement import logic in next subtask
  };

  const handleClipSelect = (clip) => {
    setSelectedClipId(clip.id);
    console.log("Clip selected:", clip);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>ClipCreate</h1>
          <span className="version">v1.0.0</span>
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
