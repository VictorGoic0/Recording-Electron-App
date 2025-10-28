import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ClipForge</h1>
      </header>
      <div className="main-layout">
        <aside className="media-library">
          <h2>Media Library</h2>
          <button>Import</button>
          <div className="placeholder">Media Library Content</div>
        </aside>
        <section className="video-preview">
          <h2>Video Preview</h2>
          <div className="placeholder">Video Preview Area</div>
        </section>
        <section className="timeline">
          <h2>Timeline</h2>
          <div className="placeholder">Timeline Content</div>
        </section>
      </div>
    </div>
  );
}

export default App;
