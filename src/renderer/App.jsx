import React from "react";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>ClipForge</h1>
          <span className="version">v1.0.0</span>
        </div>
        <div className="header-right">
          <button className="btn-secondary btn-small">Help</button>
        </div>
      </header>

      <div className="main-content">
        <div className="top-section">
          {/* Media Library - Left Panel */}
          <aside className="media-library">
            <div className="panel-header">
              <h2>Media Library</h2>
              <button className="btn-primary">+ Import</button>
            </div>
            <div className="library-content">
              <div className="placeholder-content">
                <div className="placeholder-icon">📁</div>
                <p>No media files yet</p>
                <p className="placeholder-hint">
                  Import videos or record your screen
                </p>
              </div>
            </div>
          </aside>

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
