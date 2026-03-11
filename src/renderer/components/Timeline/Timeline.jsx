import React, { useState, useRef, useEffect } from "react";
import "./Timeline.css";
import ExportModal from "../ExportModal/ExportModal";
import { usePlaybackStore } from "../../store/playbackStore";

/**
 * Clip Component with Trim Handles
 * Individual clip on the timeline with left/right trim handles
 */
function TimelineClip({ clip, zoom, scale, maxDuration = 60, playhead, maxTimelineDuration, onClipDrop }) {
  const updateClipTrim = usePlaybackStore((s) => s.updateClipTrim);
  const updateClipPosition = usePlaybackStore((s) => s.updateClipPosition);
  const selectTimelineClip = usePlaybackStore((s) => s.selectTimelineClip);
  const selectedTimelineClipId = usePlaybackStore((s) => s.selectedTimelineClipId);
  const removeClipFromTimeline = usePlaybackStore((s) => s.removeClipFromTimeline);
  const [isTrimming, setIsTrimming] = useState(null); // 'left' or 'right'
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragStartRef = useRef(null);
  
  // Local visual state during drag (no context updates until release)
  const [localTrimStart, setLocalTrimStart] = useState(null);
  const [localTrimEnd, setLocalTrimEnd] = useState(null);
  const [localPosition, setLocalPosition] = useState(null);

  const isSelected = selectedTimelineClipId === clip.id;

  const handleTrimMouseDown = (e, side) => {
    e.stopPropagation();
    e.preventDefault();
    setIsTrimming(side);
    
    // Store initial state for smooth dragging
    const initialTrimStart = clip.trimStart || 0;
    const initialTrimEnd = clip.trimEnd || clip.duration;
    
    dragStartRef.current = {
      mouseX: e.clientX,
      trimStart: initialTrimStart,
      trimEnd: initialTrimEnd,
      position: clip.position,
      duration: clip.duration,
    };
    
    // Initialize local state
    setLocalTrimStart(initialTrimStart);
    setLocalTrimEnd(initialTrimEnd);
    setLocalPosition(clip.position);
  };

  // Mouse handlers for trim dragging - THE REACT WAY (will be attached to parent)
  const handleTrimMouseMove = (e) => {
    if (!isTrimming || !dragStartRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const initial = dragStartRef.current;
    const deltaX = e.clientX - initial.mouseX;
    const secondsDelta = deltaX / scale;

    if (isTrimming === 'left') {
      // Trim from start: calculate new values and update LOCAL state only
      const newTrimStart = Math.max(0, Math.min(initial.trimEnd, initial.trimStart + secondsDelta));
      const trimDelta = newTrimStart - initial.trimStart;
      setLocalTrimStart(newTrimStart);
      setLocalPosition(initial.position + trimDelta);
    } else if (isTrimming === 'right') {
      // Trim from end: calculate new value and update LOCAL state only
      const newTrimEnd = Math.min(initial.duration, Math.max(initial.trimStart, initial.trimEnd + secondsDelta));
      setLocalTrimEnd(newTrimEnd);
    }
  };

  const handleTrimMouseUp = (e) => {
    if (!isTrimming) return;
    
    e.preventDefault();
    e.stopPropagation();

    // On release, commit final values to context
    if (isTrimming === 'left') {
      updateClipTrim(clip.id, clip.track, localTrimStart, null);
      updateClipPosition(clip.id, clip.track, localPosition);
    } else if (isTrimming === 'right') {
      updateClipTrim(clip.id, clip.track, null, localTrimEnd);
    }
    
    // Clean up
    setIsTrimming(null);
    dragStartRef.current = null;
    setLocalTrimStart(null);
    setLocalTrimEnd(null);
    setLocalPosition(null);
  };

  // Use local state during drag, context state when not dragging
  const displayTrimStart = isTrimming ? localTrimStart : (clip.trimStart || 0);
  const displayTrimEnd = isTrimming ? localTrimEnd : (clip.trimEnd || clip.duration);
  const displayPosition = isTrimming === 'left' ? localPosition : clip.position;
  
  const effectiveDuration = displayTrimEnd - displayTrimStart;
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

  // Handle clip drag start (for repositioning)
  const handleDragStart = (e) => {
    // Don't allow dragging if trimming
    if (isTrimming) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    
    // Store clip data for drag-and-drop
    const clipData = {
      ...clip,
      isRepositioning: true, // Flag to indicate this is a reposition, not a new drop
    };
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(clipData));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Calculate if playhead is within this clip for split indicator
  // playhead is absolute seconds — no conversion needed
  const trimStart = clip.trimStart || 0;
  const trimEnd = clip.trimEnd || clip.duration;
  const clipStartTime = clip.position;
  const clipEndTime = clip.position + (trimEnd - trimStart);
  const isPlayheadInClip = playhead > clipStartTime && playhead < clipEndTime;
  
  // Calculate split indicator position relative to clip
  const splitIndicatorPosition = isPlayheadInClip && isHovering 
    ? ((playhead - clipStartTime) / (clipEndTime - clipStartTime)) * 100 
    : null;

  return (
    <div
      className={`${clipClassName} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${(displayPosition / maxDuration) * zoom * 100}%`,
        width: `${(displayWidth / maxDuration) * zoom * 100}%`,
        opacity: isDragging ? 0.5 : 1,
      }}
      title={`${clip.filename} (${displayWidth.toFixed(1)}s)`}
      draggable={!isTrimming}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClipClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleTrimMouseMove}
      onMouseUp={handleTrimMouseUp}
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
      
      {/* Split indicator - shows when hovering and playhead is within clip */}
      {splitIndicatorPosition !== null && (
        <div 
          className="split-indicator"
          style={{ left: `${splitIndicatorPosition}%` }}
          title="Split here"
        />
      )}
    </div>
  );
}

/**
 * Timeline Component
 * Visual timeline with track layout and playhead
 */
function Timeline() {
  const playhead = usePlaybackStore((s) => s.playhead);
  const setPlayhead = usePlaybackStore((s) => s.setPlayhead);
  const tracks = usePlaybackStore((s) => s.tracks);
  const addClipToTimeline = usePlaybackStore((s) => s.addClipToTimeline);
  const splitClipAtPlayhead = usePlaybackStore((s) => s.splitClipAtPlayhead);
  const removeClipFromTimeline = usePlaybackStore((s) => s.removeClipFromTimeline);
  const selectedTimelineClipId = usePlaybackStore((s) => s.selectedTimelineClipId);
  const moveClipToTrack = usePlaybackStore((s) => s.moveClipToTrack);
  const updateClipPosition = usePlaybackStore((s) => s.updateClipPosition);

  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOverTrack, setDraggedOverTrack] = useState(null);
  const [timelineWidth, setTimelineWidth] = useState(600);
  const timelineContentRef = useRef(null);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate pixel scale for time-to-pixel conversion
  // scale = pixels per second at current zoom
  const scale = (timelineWidth / 60) * zoom;

  // Update timeline width on resize
  // Note: resize event must stay on window, but we add preventDefault/stopPropagation
  useEffect(() => {
    const updateWidth = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (timelineContentRef.current) {
        const rect = timelineContentRef.current.getBoundingClientRect();
        setTimelineWidth(rect.width);
      }
    };
    updateWidth(); // Initial call without event
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
    if (!timelineContentRef.current) return;

    const rect = timelineContentRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));

    // Emit absolute seconds directly — store handles clamping
    const time = percentage * maxTimelineDuration;
    setPlayhead(time);
  };

  const handlePlayheadMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    updatePlayheadPosition(e.clientX);
  };

  // Mouse handlers for playhead dragging - THE REACT WAY
  const handlePlayheadMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    updatePlayheadPosition(e.clientX);
  };

  const handlePlayheadMouseUp = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }
  };

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
      const scrollableContainer = timelineContentRef.current;
      if (!scrollableContainer) return;
      
      const scrollLeft = scrollableContainer.scrollLeft;
      const containerRect = scrollableContainer.getBoundingClientRect();
      
      // Get mouse position relative to the scrollable container's viewport
      const mouseXInViewport = e.clientX - containerRect.left;
      
      // Add scroll offset to get position in the full timeline
      const mouseXInTimeline = mouseXInViewport + scrollLeft;
      
      // Calculate actual timeline width (not viewport width)
      const actualTimelineWidth = maxTimelineDuration * zoom * 10;
      
      // Convert pixel position to time
      const position = Math.max(0, Math.min(maxTimelineDuration, (mouseXInTimeline / actualTimelineWidth) * maxTimelineDuration));

      // Check if this is a repositioning operation (clip already on timeline)
      if (clip.isRepositioning) {
        // Move clip to new track/position while preserving ALL state
        // This includes trimStart, trimEnd, and any other timeline edits
        if (clip.track === trackId) {
          // Same track, just update position
          updateClipPosition(clip.id, trackId, position);
        } else {
          // Different track, move clip with all its state
          moveClipToTrack(clip.id, clip.track, trackId, position);
        }
      } else {
        // New clip from media library
        addClipToTimeline(clip, trackId, position);
      }
    } catch (error) {
      console.error("Failed to parse dropped clip data:", error);
    }
  };

  const handleExport = async () => {
    // Collect all clips from all tracks
    const allClips = [];
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        allClips.push(clip);
      });
    });

    // Sort clips by timeline position (left to right)
    allClips.sort((a, b) => a.position - b.position);

    if (allClips.length === 0) {
      alert("No clips to export. Please add clips to the timeline.");
      return;
    }

    // Check if electron API is available
    if (!window.electron || !window.electron.export) {
      console.error("Electron export API not available");
      alert("Export functionality not ready. Please restart the app.");
      return;
    }

    try {
      // Show save dialog
      const dialogResult = await window.electron.export.showSaveDialog();
      
      if (!dialogResult.success || dialogResult.canceled || !dialogResult.filePath) {
        return; // User canceled or error
      }

      const outputPath = dialogResult.filePath;
      
      console.log("Exporting timeline:", {
        clips: allClips.length,
        outputPath,
      });

      // Show export modal and reset progress
      setShowExportModal(true);
      setExportProgress(0);
      setIsExporting(true);

      // Set up progress listener
      window.electron.export.onProgress((progress) => {
        console.log(`Export progress: ${progress}%`);
        setExportProgress(progress);
      });

      // Execute export
      const exportResult = await window.electron.export.exportTimeline({
        clips: allClips,
        outputPath,
        tracks, // Pass tracks for multi-track export
      });

      // Clean up progress listener
      window.electron.export.removeProgressListener();
      setIsExporting(false);
      setShowExportModal(false);

      if (exportResult.success) {
        alert(`Export completed! Saved to: ${exportResult.outputPath}`);
      } else {
        const errorMsg = exportResult.error || "Unknown error";
        alert(`Export failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      setIsExporting(false);
      setShowExportModal(false);
      
      // Provide user-friendly error message
      let errorMessage = "Unknown error occurred during export";
      if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Export failed: ${errorMessage}`);
    }
  };

  const handleCancelExport = () => {
    // TODO: Implement cancel functionality (kill FFmpeg process)
    setIsExporting(false);
    setShowExportModal(false);
    setExportProgress(0);
    console.log("Export cancelled");
  };

  const handleSplit = (event) => {
    event.preventDefault();
    event.stopPropagation();

    // playhead is absolute seconds — use directly
    const splitTime = playhead;

    // Find clip at playhead position on each track
    let clipToSplit = null;
    let trackId = null;
    
    for (const track of tracks) {
      for (const clip of track.clips) {
        const trimStart = clip.trimStart || 0;
        const trimEnd = clip.trimEnd || clip.duration;
        const clipStartTime = clip.position;
        const clipEndTime = clip.position + (trimEnd - trimStart);
        
        // Check if playhead is within this clip
        if (splitTime > clipStartTime && splitTime < clipEndTime) {
          clipToSplit = clip;
          trackId = track.id;
          break;
        }
      }
      if (clipToSplit) break;
    }
    
    if (!clipToSplit) {
      alert("No clip found at playhead position");
      return;
    }
    
    // Perform the split
    splitClipAtPlayhead(clipToSplit.id, trackId, splitTime);
    console.log(`Split clip ${clipToSplit.filename} at ${splitTime}s`);
  };

  const handleDeleteClip = () => {
    if (!selectedTimelineClipId) {
      console.log("No clip selected to delete");
      return;
    }

    // Find the selected clip and its track
    let clipToDelete = null;
    let trackId = null;

    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedTimelineClipId);
      if (clip) {
        clipToDelete = clip;
        trackId = track.id;
        break;
      }
    }

    if (!clipToDelete || !trackId) {
      console.error("Selected clip not found in tracks");
      return;
    }

    // Remove the clip
    removeClipFromTimeline(selectedTimelineClipId, trackId);
    console.log(`Deleted clip ${clipToDelete.filename} from ${trackId} track`);
  };

  // Keyboard event handler for Delete/Backspace and Ctrl+K - THE REACT WAY
  const handleKeyDown = (event) => {
    // Only handle keyboard shortcuts when not typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    // Delete/Backspace: Delete selected clip
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      handleDeleteClip();
    }

    // Ctrl+K or Cmd+K: Split clip at playhead
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      event.stopPropagation();
      handleSplit(event);
    }
  };

  return (
    <div 
      className="timeline-component"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}
    >
      <div className="panel-header">
        <h2>Timeline</h2>
        <div className="timeline-controls">
          <button className="btn-export" title="Export" onClick={handleExport}>
            📤 <span>Export</span>
          </button>
          <button className="btn-split" title="Split Clip (Ctrl/Cmd+K)" onClick={handleSplit}>
            ✂️ <span>Split</span>
          </button>
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
          <div className={`track-label-item ${draggedOverTrack === "main" ? "active" : ""}`}>MAIN</div>
          <div className={`track-label-item ${draggedOverTrack === "overlay" ? "active" : ""}`}>OVERLAY</div>
          <div className={`track-label-item ${draggedOverTrack === "overlay2" ? "active" : ""}`}>OVERLAY 2</div>
        </div>

        {/* Scrollable Timeline Section */}
        <div 
          className="timeline-scrollable" 
          ref={timelineContentRef}
          onMouseMove={handlePlayheadMouseMove}
          onMouseUp={handlePlayheadMouseUp}
        >
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
                style={{ left: `${(playhead / maxTimelineDuration) * 100}%` }}
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
                  <TimelineClip 
                    key={clip.id} 
                    clip={clip} 
                    zoom={zoom} 
                    scale={scale} 
                    maxDuration={maxTimelineDuration}
                    playhead={playhead}
                    maxTimelineDuration={maxTimelineDuration}
                  />
                ))}
                <div 
                  className="playhead-line" 
                  style={{ left: `${(playhead / maxTimelineDuration) * 100}%` }}
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
                  <TimelineClip 
                    key={clip.id} 
                    clip={{ ...clip, type: 'overlay' }} 
                    zoom={zoom} 
                    scale={scale} 
                    maxDuration={maxTimelineDuration}
                    playhead={playhead}
                    maxTimelineDuration={maxTimelineDuration}
                  />
                ))}
                <div 
                  className="playhead-line" 
                  style={{ left: `${(playhead / maxTimelineDuration) * 100}%` }}
                  onMouseDown={handlePlayheadMouseDown}
                />
              </div>
            </div>

            <div className="track track-overlay2">
              <div 
                className={`track-content ${draggedOverTrack === "overlay2" ? "drag-over" : ""}`}
                onDragOver={(e) => handleTrackDragOver(e, "overlay2")}
                onDragLeave={handleTrackDragLeave}
                onDrop={(e) => handleTrackDrop(e, "overlay2")}
              >
                {/* Render clips for Overlay 2 track */}
                {tracks.find((t) => t.id === "overlay2")?.clips.map((clip) => (
                  <TimelineClip 
                    key={clip.id} 
                    clip={{ ...clip, type: 'overlay' }} 
                    zoom={zoom} 
                    scale={scale} 
                    maxDuration={maxTimelineDuration}
                    playhead={playhead}
                    maxTimelineDuration={maxTimelineDuration}
                  />
                ))}
                <div 
                  className="playhead-line" 
                  style={{ left: `${(playhead / maxTimelineDuration) * 100}%` }}
                  onMouseDown={handlePlayheadMouseDown}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Progress Modal */}
      <ExportModal
        isOpen={showExportModal}
        progress={exportProgress}
        onCancel={handleCancelExport}
      />
    </div>
  );
}

export default Timeline;

