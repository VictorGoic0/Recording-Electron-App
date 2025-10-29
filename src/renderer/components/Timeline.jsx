import React, { useState } from "react";
import "./Timeline.css";

/**
 * Timeline Component
 * Visual timeline with track layout and playhead
 */
function Timeline({ playhead = 0, onPlayheadChange }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="timeline-component">
      <div className="panel-header">
        <h2>Timeline</h2>
        <div className="timeline-controls">
          <button className="btn-icon" title="Zoom In" onClick={() => setZoom(Math.min(zoom + 0.5, 10))}>
            +
          </button>
          <button className="btn-icon" title="Zoom Out" onClick={() => setZoom(Math.max(zoom - 0.5, 1))}>
            −
          </button>
          <span className="zoom-indicator">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      <div className="timeline-content">
        {/* Time Ruler */}
        <div className="time-ruler">
          <div className="time-ruler-container">
            {/* Time markers will be rendered here */}
          </div>
        </div>

        {/* Tracks */}
        <div className="tracks-container">
          <div className="track track-main">
            <div className="track-label">
              <span>Main</span>
            </div>
            <div className="track-content">
              {/* Clips will be rendered here */}
              <div className="playhead-line" style={{ left: `${playhead * 100}%` }} />
            </div>
          </div>

          <div className="track track-overlay">
            <div className="track-label">
              <span>Overlay</span>
            </div>
            <div className="track-content">
              {/* Clips will be rendered here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;

