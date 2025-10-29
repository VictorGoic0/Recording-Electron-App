import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import "./Timeline.css";

/**
 * Timeline Component
 * Visual timeline with track layout and playhead
 */
function Timeline({ playhead = 0, onPlayheadChange }) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const timelineContentRef = useRef(null);

  // Generate time markers based on zoom level
  const timeMarkers = useMemo(() => {
    const markers = [];
    const maxSeconds = 60; // Show up to 60 seconds
    let interval;
    let minorTickInterval;

    // Determine interval based on zoom
    if (zoom >= 8) {
      interval = 1; // Every second
      minorTickInterval = 0.5;
    } else if (zoom >= 5) {
      interval = 2; // Every 2 seconds
      minorTickInterval = 1;
    } else if (zoom >= 3) {
      interval = 5; // Every 5 seconds
      minorTickInterval = 2.5;
    } else if (zoom >= 2) {
      interval = 10; // Every 10 seconds
      minorTickInterval = 5;
    } else {
      interval = 15; // Every 15 seconds
      minorTickInterval = 5;
    }

    for (let time = 0; time <= maxSeconds; time += minorTickInterval) {
      const isMajor = time % interval === 0;
      markers.push({
        time,
        isMajor,
        seconds: time % 60,
        minutes: Math.floor(time / 60),
      });
    }

    return markers;
  }, [zoom]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  const updatePlayheadPosition = useCallback((clientX) => {
    if (!timelineContentRef.current || !onPlayheadChange) return;
    
    const rect = timelineContentRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    
    // Calculate time in seconds (assuming max 60 seconds for now)
    const time = percentage * 60;
    onPlayheadChange(time / 60); // Normalized to 0-1
  }, [onPlayheadChange]);

  const handlePlayheadMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    updatePlayheadPosition(e.clientX);
  }, [updatePlayheadPosition]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updatePlayheadPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, updatePlayheadPosition]);

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

      <div className="timeline-content" ref={timelineContentRef}>
        {/* Time Ruler */}
        <div className="time-ruler">
          <div className="time-ruler-container" style={{ minWidth: `${60 * zoom * 10}px` }}>
            {timeMarkers.map((marker, index) => (
              <div
                key={index}
                className={`time-tick ${marker.isMajor ? "time-tick-major" : "time-tick-minor"}`}
                style={{
                  left: `${(marker.time / 60) * zoom * 100}%`,
                }}
              >
                {marker.isMajor && (
                  <div className="time-label">{formatTime(marker.time)}</div>
                )}
              </div>
            ))}
            {/* Playhead in ruler */}
            <div 
              className="playhead-line playhead-ruler"
              style={{ left: `${playhead * 100}%` }}
              onMouseDown={handlePlayheadMouseDown}
            />
          </div>
        </div>

        {/* Tracks */}
        <div className="tracks-container" style={{ minWidth: `${60 * zoom * 10}px` }}>
          <div className="track track-main">
            <div className="track-label">
              <span>Main</span>
            </div>
            <div className="track-content">
              {/* Clips will be rendered here */}
              <div 
                className="playhead-line" 
                style={{ left: `${playhead * 100}%` }}
                onMouseDown={handlePlayheadMouseDown}
              />
            </div>
          </div>

          <div className="track track-overlay">
            <div className="track-label">
              <span>Overlay</span>
            </div>
            <div className="track-content">
              {/* Clips will be rendered here */}
              <div 
                className="playhead-line" 
                style={{ left: `${playhead * 100}%` }}
                onMouseDown={handlePlayheadMouseDown}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;

