import React, { useState, useRef, useEffect } from "react";
import "./Timeline.css";
import { useTimeline } from "../context/TimelineContext";

/**
 * Clip Component with Trim Handles
 * Individual clip on the timeline with left/right trim handles
 */
function TimelineClip({ clip, zoom, scale, maxDuration = 60 }) {
  const { updateClipTrim, updateClipPosition, selectTimelineClip, selectedTimelineClipId } = useTimeline();
  const [isTrimming, setIsTrimming] = useState(null); // 'left' or 'right'
  const dragStartRef = useRef(null);

  const isSelected = selectedTimelineClipId === clip.id;

  const handleTrimMouseDown = (e, side) => {
    e.stopPropagation();
    e.preventDefault();
    setIsTrimming(side);
    
    // Store initial state for smooth dragging
    dragStartRef.current = {
      mouseX: e.clientX,
      trimStart: clip.trimStart || 0,
      trimEnd: clip.trimEnd || clip.duration,
      position: clip.position,
      duration: clip.duration,
    };
  };

  useEffect(() => {
    if (!isTrimming || !dragStartRef.current) return;

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const initial = dragStartRef.current;
      const deltaX = e.clientX - initial.mouseX;
      const secondsDelta = deltaX / scale;

      if (isTrimming === 'left') {
        // Trim from start: calculate new trim start from INITIAL values
        const newTrimStart = Math.max(0, Math.min(initial.trimEnd, initial.trimStart + secondsDelta));
        const trimDelta = newTrimStart - initial.trimStart;
        updateClipTrim(clip.id, clip.track, newTrimStart, null);
        updateClipPosition(clip.id, clip.track, initial.position + trimDelta);
      } else if (isTrimming === 'right') {
        // Trim from end: calculate new trim end from INITIAL values
        const newTrimEnd = Math.min(initial.duration, Math.max(initial.trimStart, initial.trimEnd + secondsDelta));
        updateClipTrim(clip.id, clip.track, null, newTrimEnd);
      }
    };

    const handleMouseUp = () => {
      setIsTrimming(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTrimming, clip.id, clip.track, scale, updateClipTrim, updateClipPosition]);

  const effectiveDuration = (clip.trimEnd || clip.duration) - (clip.trimStart || 0);
  const displayWidth = effectiveDuration;

  const clipType = clip.type === 'overlay' ? 'overlay' : 'main';
  const clipClassName = `timeline-clip clip-${clipType} ${isSelected ? 'selected' : ''}`;

  const handleClipClick = (e) => {
    // Don't select if clicking on trim handles
    if (e.target.classList.contains('trim-handle')) return;
    e.preventDefault();
    e.stopPropagation();
    selectTimelineClip(clip.id);
  };

  return (
    <div
      className={clipClassName}
      style={{
        left: `${(clip.position / maxDuration) * zoom * 100}%`,
        width: `${(displayWidth / maxDuration) * zoom * 100}%`,
      }}
      title={`${clip.filename} (${displayWidth.toFixed(1)}s)`}
      onClick={handleClipClick}
    >
      {/* Left trim handle */}
      <div
        className="trim-handle trim-handle-left"
        onMouseDown={(e) => handleTrimMouseDown(e, 'left')}
      />
      {/* Right trim handle */}
      <div
        className="trim-handle trim-handle-right"
        onMouseDown={(e) => handleTrimMouseDown(e, 'right')}
      />
      <div className="clip-label">{clip.filename}</div>
    </div>
  );
}

/**
 * Timeline Component
 * Visual timeline with track layout and playhead
 */
function Timeline({ playhead = 0, onPlayheadChange }) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOverTrack, setDraggedOverTrack] = useState(null);
  const [timelineWidth, setTimelineWidth] = useState(600);
  const timelineContentRef = useRef(null);
  const { tracks, addClipToTimeline } = useTimeline();

  // Calculate pixel scale for time-to-pixel conversion
  // scale = pixels per second at current zoom
  const scale = (timelineWidth / 60) * zoom;

  // Update timeline width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (timelineContentRef.current) {
        const rect = timelineContentRef.current.getBoundingClientRect();
        setTimelineWidth(rect.width);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate maximum timeline duration based on clips
  let maxTimelineDuration = 60; // Default minimum 60 seconds
  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const clipEnd = clip.position + (clip.trimEnd || clip.duration);
      if (clipEnd > maxTimelineDuration) {
        maxTimelineDuration = clipEnd;
      }
    });
  });
  // Round up to nearest 5 seconds for cleaner display
  maxTimelineDuration = Math.ceil(maxTimelineDuration / 5) * 5;

  // Generate time markers based on zoom level
  const markers = [];
  const maxSeconds = maxTimelineDuration;
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

  const timeMarkers = markers;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  const updatePlayheadPosition = (clientX) => {
    if (!timelineContentRef.current || !onPlayheadChange) return;
    
    const rect = timelineContentRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    
    // Calculate time in seconds based on actual timeline duration
    const time = percentage * maxTimelineDuration;
    onPlayheadChange(time / maxTimelineDuration); // Normalized to 0-1
  };

  const handlePlayheadMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updatePlayheadPosition(e.clientX);
  };

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
  }, [isDragging]);

  const handleTrackDragOver = (e, trackId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDraggedOverTrack(trackId);
  };

  const handleTrackDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverTrack(null);
  };

  const handleTrackDrop = (e, trackId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverTrack(null);

    try {
      const clipData = e.dataTransfer.getData("application/json");
      if (!clipData) return;

      const clip = JSON.parse(clipData);
      
      // Calculate drop position based on mouse X
      // Need to account for the scrollable container and actual timeline width
      const trackRect = e.currentTarget.getBoundingClientRect();
      const scrollableContainer = timelineContentRef.current;
      const scrollLeft = scrollableContainer ? scrollableContainer.scrollLeft : 0;
      
      // Get mouse position relative to track, accounting for scroll
      const relativeX = e.clientX - trackRect.left + scrollLeft;
      
      // Calculate actual timeline width (not viewport width)
      const actualTimelineWidth = maxTimelineDuration * zoom * 10;
      
      // Convert pixel position to time
      const position = Math.max(0, Math.min(maxTimelineDuration, (relativeX / actualTimelineWidth) * maxTimelineDuration));

      addClipToTimeline(clip, trackId, position);
    } catch (error) {
      console.error("Failed to parse dropped clip data:", error);
    }
  };

  return (
    <div className="timeline-component">
      <div className="panel-header">
        <h2>Timeline</h2>
        <div className="timeline-controls">
          <button className="btn-icon" title="Zoom In" onClick={() => setZoom(Math.min(zoom + 0.5, 10))}>
            +
          </button>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="zoom-slider"
            title="Zoom"
          />
          <button className="btn-icon" title="Zoom Out" onClick={() => setZoom(Math.max(zoom - 0.5, 1))}>
            −
          </button>
          <span className="zoom-indicator">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      <div className="timeline-content">
        {/* Fixed Track Labels Column */}
        <div className="track-labels-column">
          <div className="track-label-spacer"></div>
          <div className="track-label-item">MAIN</div>
          <div className="track-label-item">OVERLAY</div>
        </div>

        {/* Scrollable Timeline Section */}
        <div className="timeline-scrollable" ref={timelineContentRef}>
          {/* Time Ruler */}
          <div className="time-ruler">
            <div className="time-ruler-container" style={{ minWidth: `${maxTimelineDuration * zoom * 10}px` }}>
              {timeMarkers.map((marker, index) => (
                <div
                  key={index}
                  className={`time-tick ${marker.isMajor ? "time-tick-major" : "time-tick-minor"}`}
                  style={{
                    left: `${(marker.time / maxTimelineDuration) * zoom * 100}%`,
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
          <div className="tracks-container" style={{ minWidth: `${maxTimelineDuration * zoom * 10}px` }}>
            <div className="track track-main">
              <div 
                className={`track-content ${draggedOverTrack === "main" ? "drag-over" : ""}`}
                onDragOver={(e) => handleTrackDragOver(e, "main")}
                onDragLeave={handleTrackDragLeave}
                onDrop={(e) => handleTrackDrop(e, "main")}
              >
                {/* Render clips for Main track */}
                {tracks.find((t) => t.id === "main")?.clips.map((clip) => (
                  <TimelineClip key={clip.id} clip={clip} zoom={zoom} scale={scale} maxDuration={maxTimelineDuration} />
                ))}
                <div 
                  className="playhead-line" 
                  style={{ left: `${playhead * 100}%` }}
                  onMouseDown={handlePlayheadMouseDown}
                />
              </div>
            </div>

            <div className="track track-overlay">
              <div 
                className={`track-content ${draggedOverTrack === "overlay" ? "drag-over" : ""}`}
                onDragOver={(e) => handleTrackDragOver(e, "overlay")}
                onDragLeave={handleTrackDragLeave}
                onDrop={(e) => handleTrackDrop(e, "overlay")}
              >
                {/* Render clips for Overlay track */}
                {tracks.find((t) => t.id === "overlay")?.clips.map((clip) => (
                  <TimelineClip key={clip.id} clip={{ ...clip, type: 'overlay' }} zoom={zoom} scale={scale} maxDuration={maxTimelineDuration} />
                ))}
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
    </div>
  );
}

export default Timeline;

