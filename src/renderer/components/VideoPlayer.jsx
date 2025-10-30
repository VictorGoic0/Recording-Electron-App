import React, { useRef, useState, useEffect, useCallback } from "react";
import "./VideoPlayer.css";

/**
 * VideoPlayer Component
 * HTML5 video player with custom controls for previewing clips
 * 
 * IMPORTANT: Uses custom 'local-video://' protocol registered in main.js
 * to securely load local video files without triggering Electron's
 * file:// security restrictions.
 */
function VideoPlayer({ selectedMediaClip, selectedTimelineClip, tracks, playhead, onShowToast, onCurrentTimeChange, timelinePlayhead }) {
  const videoRef = useRef(null);
  const overlayVideoRefs = useRef([]);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // Determine which clip to preview: timeline clip takes priority over media library clip
  const selectedClip = selectedTimelineClip || selectedMediaClip;
  const isTimelineClip = !!selectedTimelineClip;
  
  // Multi-track preview mode: show overlays when there are overlay clips in the timeline
  // Check if overlay tracks have any clips
  const hasOverlayClips = tracks && (
    tracks.find(t => t.id === "overlay")?.clips.length > 0 ||
    tracks.find(t => t.id === "overlay2")?.clips.length > 0
  );
  const isMultiTrackMode = hasOverlayClips && !selectedMediaClip;
  
  // Get trim bounds (only apply for timeline clips)
  const trimStart = isTimelineClip ? (selectedTimelineClip.trimStart || 0) : 0;
  const trimEnd = isTimelineClip ? (selectedTimelineClip.trimEnd || selectedClip?.duration || 0) : (selectedClip?.duration || 0);

  // Get overlay clips at current playhead position (for multi-track mode)
  const getOverlayClips = () => {
    if (!isMultiTrackMode || !tracks) return [];
    
    const overlays = [];
    // Get overlay and overlay2 tracks
    const overlayTrack = tracks.find(track => track.id === "overlay");
    const overlay2Track = tracks.find(track => track.id === "overlay2");
    
    if (overlayTrack) {
      overlayTrack.clips.forEach(clip => {
        overlays.push({ ...clip, trackId: "overlay" });
      });
    }
    
    if (overlay2Track) {
      overlay2Track.clips.forEach(clip => {
        overlays.push({ ...clip, trackId: "overlay2" });
      });
    }
    
    return overlays;
  };

  const overlayClips = getOverlayClips();

  // Sync timeline playhead changes to video (when user drags playhead on timeline)
  useEffect(() => {
    if (videoRef.current && duration > 0 && timelinePlayhead !== undefined) {
      const newTime = timelinePlayhead * duration;
      
      // Validate newTime is a finite number
      if (!isFinite(newTime) || isNaN(newTime)) {
        console.error("VideoPlayer: Invalid time calculated from playhead", {
          timelinePlayhead,
          duration,
          newTime,
          selectedClip
        });
        return;
      }
      
      if (Math.abs(videoRef.current.currentTime - newTime) > 0.1) {
        videoRef.current.currentTime = newTime;
      }
      
      // Sync overlay videos
      overlayVideoRefs.current.forEach(overlayVideo => {
        if (overlayVideo && Math.abs(overlayVideo.currentTime - newTime) > 0.1) {
          overlayVideo.currentTime = newTime;
        }
      });
    }
  }, [timelinePlayhead, duration, selectedClip]);

  // Sync overlay videos play/pause with main video
  useEffect(() => {
    if (!videoRef.current || overlayClips.length === 0) return;
    
    const mainVideo = videoRef.current;
    
    const syncOverlays = () => {
      overlayVideoRefs.current.forEach(overlayVideo => {
        if (!overlayVideo) return;
        
        // Sync play state
        if (isPlaying && overlayVideo.paused) {
          overlayVideo.play().catch(err => console.warn("Overlay play failed:", err));
        } else if (!isPlaying && !overlayVideo.paused) {
          overlayVideo.pause();
        }
        
        // Sync time
        if (Math.abs(overlayVideo.currentTime - mainVideo.currentTime) > 0.2) {
          overlayVideo.currentTime = mainVideo.currentTime;
        }
      });
    };
    
    // Sync on play/pause changes
    syncOverlays();
    
    // Periodically sync during playback
    const syncInterval = setInterval(syncOverlays, 100);
    
    return () => clearInterval(syncInterval);
  }, [isPlaying, overlayClips.length]);

  // Reset player and load new source when clip file changes (NOT when trim changes)
  useEffect(() => {
    if (!selectedClip) {
      // No clip selected - reset everything
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (videoRef.current) {
      // Pause current playback
      videoRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setError(null);

      // Load new video source
      const video = videoRef.current;
      
      // Verify file path exists
      if (!selectedClip.filePath) {
        console.error("Selected clip has no file path:", selectedClip);
        setError("Video file path is missing");
        if (onShowToast) {
          onShowToast("Video file path is missing. Please select another clip.", "error");
        }
        return;
      }

      // Use custom local-video:// protocol to load files securely
      // This protocol is registered in the main process and bypasses Electron's
      // file:// security restrictions while maintaining safety
      let videoSrc = selectedClip.filePath;
      
      // If already using a special protocol (blob, local-video), keep it as-is
      if (!videoSrc.startsWith("local-video:") && !videoSrc.startsWith("blob:")) {
        // Normalize path: convert backslashes to forward slashes (Windows compatibility)
        let normalizedPath = videoSrc.replace(/\\/g, "/");
        
        // Use custom protocol with the path as a query parameter to avoid URL parsing issues
        // This prevents the browser from misinterpreting drive letters (C:) as hostname
        videoSrc = `local-video://load?path=${encodeURIComponent(normalizedPath)}`;
      }

      // Update video source
      video.src = videoSrc;
      
      // Load the video metadata
      video.load();

      // Handle load errors
      const handleLoadError = (e) => {
        console.error("Failed to load video:", e);
        const errorMessage = "Failed to load video. File may have been moved or deleted.";
        setError(errorMessage);
        if (onShowToast) {
          onShowToast(errorMessage, "error");
        }
      };

      video.addEventListener("error", handleLoadError, { once: true });

      // For timeline clips, seek to trimStart once loaded
      const handleLoadedMetadata = () => {
        if (isTimelineClip && trimStart > 0) {
          video.currentTime = trimStart;
        }
      };
      
      video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });

      // Cleanup
      return () => {
        video.removeEventListener("error", handleLoadError);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [selectedClip?.filePath, selectedClip?.id]);

  // Handle trim boundary changes without reloading video
  useEffect(() => {
    if (!videoRef.current || !isTimelineClip) return;

    const video = videoRef.current;
    const currentTime = video.currentTime;

    // If current playback position is now outside trim bounds, adjust it
    if (currentTime < trimStart) {
      // Current position is before new trim start - seek to trim start
      video.currentTime = trimStart;
    } else if (currentTime > trimEnd) {
      // Current position is after new trim end - seek to trim start
      video.currentTime = trimStart;
    }
    // Otherwise, keep playing at current position (within bounds)
  }, [isTimelineClip, trimStart, trimEnd]);

  // Load saved volume preference
  useEffect(() => {
    const savedVolume = localStorage.getItem("videoPlayerVolume");
    if (savedVolume !== null) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
      if (videoRef.current) {
        videoRef.current.volume = vol;
      }
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    console.log("toggle play pause")
    if (!videoRef.current || !selectedClip) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((err) => {
        console.error("Play error:", err);
        const errorMessage = "Failed to play video";
        setError(errorMessage);
        if (onShowToast) {
          onShowToast(errorMessage, "error");
        }
      });
      setIsPlaying(true);
    }
  }, [selectedClip, isPlaying]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keyboard shortcuts if a video is selected
      if (!selectedClip) return;

      // Ignore if user is typing in an input field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key) {
        case " ": // Spacebar
        case "k": // K is common for play/pause in video players
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          // Skip backward 10 seconds
          console.log("arrow left")
          if (videoRef.current && videoRef.current.duration > 0) {
            const currentTime = videoRef.current.currentTime;
            const newTime = Math.max(currentTime - 10, 0);
            videoRef.current.currentTime = newTime;
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          console.log("arrow right")
          // Skip forward 10 seconds
          if (videoRef.current && videoRef.current.duration > 0) {
            const currentTime = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            const newTime = Math.min(currentTime + 10, duration);
            videoRef.current.currentTime = newTime;
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          // Increase volume
          {
            // Get current volume from state via setVolume callback pattern
            setVolume((currentVolume) => {
              const newVolume = Math.min(currentVolume + 0.1, 1);
              if (videoRef.current) {
                videoRef.current.volume = newVolume;
                videoRef.current.muted = false;
              }
              setIsMuted(false);
              localStorage.setItem("videoPlayerVolume", newVolume.toString());
              return newVolume;
            });
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          // Decrease volume
          {
            // Get current volume from state via setVolume callback pattern
            setVolume((currentVolume) => {
              const newVolume = Math.max(currentVolume - 0.1, 0);
              if (videoRef.current) {
                videoRef.current.volume = newVolume;
              }
              localStorage.setItem("videoPlayerVolume", newVolume.toString());
              return newVolume;
            });
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedClip, togglePlayPause]);  // Removed excessive dependencies that caused constant re-registration

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      
      // Validate duration before setting
      if (!isFinite(videoDuration) || isNaN(videoDuration) || videoDuration <= 0) {
        console.warn("VideoPlayer: Invalid duration from video element", {
          duration: videoDuration,
          selectedClip
        });
        setDuration(0);
      } else {
        setDuration(videoDuration);
      }
      
      // Check for audio-only files
      if (videoRef.current.videoWidth === 0 && videoRef.current.videoHeight === 0) {
        const errorMessage = "Audio-only files are not supported. Please use a video file.";
        setError(errorMessage);
        if (onShowToast) {
          onShowToast(errorMessage, "warning");
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      console.log("time update")
      const newTime = videoRef.current.currentTime;
      
      // For timeline clips, constrain playback to trimmed range
      if (isTimelineClip && newTime >= trimEnd) {
        console.log("time update pause")
        videoRef.current.pause();
        videoRef.current.currentTime = trimEnd;
        setIsPlaying(false);
        setCurrentTime(trimEnd);
        return;
      }
      
      setCurrentTime(newTime);
      
      // Notify parent of time change for timeline sync
      if (onCurrentTimeChange && videoRef.current.duration > 0) {
        const playheadPosition = newTime / videoRef.current.duration;
        onCurrentTimeChange(playheadPosition);
      }
    }
  };

  // Sync playhead changes from timeline to video
  useEffect(() => {
    // This will be handled by seek handlers
  }, []);

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleError = (e) => {
    console.error("[VideoPlayer] Video player error:", e);
    
    // Try to get more detailed error information from the video element
    if (videoRef.current && videoRef.current.error) {
      const mediaError = videoRef.current.error;
      const errorCode = mediaError.code;
      const errorMessage = mediaError.message || "Unknown error";
      
      // Map error codes to user-friendly messages
      const errorMessages = {
        1: "Video loading was aborted",
        2: "Network error while loading video",
        3: "Video decoding failed - file may be corrupted or use an unsupported format",
        4: "Video format not supported or file not found",
      };
      
      const userFriendlyError = errorMessages[errorCode] || "Unable to load video";
      console.error("[VideoPlayer] Media Error Details:", {
        code: errorCode,
        message: errorMessage,
        userMessage: userFriendlyError,
        src: videoRef.current.src,
      });
      
      setError(userFriendlyError);
      if (onShowToast) {
        onShowToast(userFriendlyError, "error");
      }
    } else {
      const errorMessage = "Failed to load video. File may be corrupted or in an unsupported format.";
      setError(errorMessage);
      if (onShowToast) {
        onShowToast(errorMessage, "error");
      }
    }
    
    setIsPlaying(false);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (isMuted) {
        // Unmute when user adjusts volume
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
    localStorage.setItem("videoPlayerVolume", newVolume.toString());
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const handleProgressBarMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSeeking(true);
    if (!videoRef.current || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // For timeline clips, constrain seeking to trimmed range
    let time;
    if (isTimelineClip) {
      time = trimStart + pos * (trimEnd - trimStart);
    } else {
      time = pos * duration;
    }

    console.log("progress bar mouse down", time)
    
    videoRef.current.currentTime = time;

    setCurrentTime(time);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (!isSeeking) return;

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!videoRef.current || !progressBarRef.current || !duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      
      // For timeline clips, constrain seeking to trimmed range
      let time;
      if (isTimelineClip) {
        time = trimStart + pos * (trimEnd - trimStart);
      } else {
        time = pos * duration;
      }
      
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    };

    const handleMouseUp = () => {
      setIsSeeking(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSeeking, duration, isTimelineClip, trimStart, trimEnd]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate display values based on whether we're viewing a timeline clip or media library clip
  const displayDuration = isTimelineClip ? (trimEnd - trimStart) : duration;
  const displayCurrentTime = isTimelineClip ? Math.max(0, currentTime - trimStart) : currentTime;
  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0;

  return (
    <section className="video-preview">
      <div className="panel-header">
        <h2>Preview</h2>
        {selectedClip && (
          <span className="preview-filename">{selectedClip.filename}</span>
        )}
      </div>

      <div className="preview-content">
        {!selectedClip ? (
          <div className="placeholder-content">
            <div className="placeholder-icon">🎬</div>
            <p>No video selected</p>
            <p className="placeholder-hint">Select a clip from the media library</p>
          </div>
        ) : error ? (
          <div className="placeholder-content">
            <div className="placeholder-icon error">⚠️</div>
            <p>{error}</p>
            <p className="placeholder-hint">Try selecting a different clip</p>
          </div>
        ) : (
          <>
            <div className="video-container">
              <video
                ref={videoRef}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onError={handleError}
                className="video-element"
              />
              
              {/* Overlay videos for multi-track preview */}
              {overlayClips.map((overlayClip, index) => {
                const videoSrc = overlayClip.filePath?.startsWith("local-video:") || overlayClip.filePath?.startsWith("blob:") 
                  ? overlayClip.filePath
                  : `local-video://load?path=${encodeURIComponent(overlayClip.filePath?.replace(/\\/g, "/") || "")}`;
                
                // Position: first overlay bottom-right, second overlay bottom-left
                const position = overlayClip.trackId === "overlay" 
                  ? { bottom: "80px", right: "20px" }
                  : { bottom: "80px", left: "20px" };
                
                return (
                  <video
                    key={`${overlayClip.id}-${index}`}
                    ref={el => overlayVideoRefs.current[index] = el}
                    src={videoSrc}
                    className="video-overlay"
                    style={{
                      position: "absolute",
                      ...position,
                      width: "25%",
                      maxWidth: "320px",
                      height: "auto",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                      zIndex: 10 + index,
                    }}
                    muted
                  />
                );
              })}
            </div>

            <div className="video-controls">
              <button
                className="control-btn play-pause"
                onClick={togglePlayPause}
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <div className="time-display">
                {formatTime(displayCurrentTime)} / {formatTime(displayDuration)}
              </div>

              <div
                ref={progressBarRef}
                className={`progress-bar-container ${isSeeking ? "is-seeking" : ""}`}
                onMouseDown={handleProgressBarMouseDown}
                style={{ cursor: isSeeking ? "grabbing" : "pointer" }}
              >
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="progress-bar-handle"
                    style={{ left: `${progress}%` }}
                  />
                </div>
              </div>

              <button
                className="control-btn volume-btn"
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
              </button>

              <div className="volume-control-group">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  title={`Volume: ${Math.round(volume * 100)}%`}
                />
                <span className="volume-percentage">
                  {isMuted ? "Muted" : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default VideoPlayer;

