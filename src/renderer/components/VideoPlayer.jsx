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
function VideoPlayer({ selectedClip, onShowToast }) {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // Reset player and load new source when clip changes
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

      // Cleanup
      return () => {
        video.removeEventListener("error", handleLoadError);
      };
    }
  }, [selectedClip]);

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
  }, [isPlaying, selectedClip, onShowToast]);

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
          if (videoRef.current && videoRef.current.duration > 0) {
            const currentTime = videoRef.current.currentTime;
            const newTime = Math.max(currentTime - 10, 0);
            videoRef.current.currentTime = newTime;
          }
          break;
        case "ArrowRight":
          e.preventDefault();
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
            const newVolume = Math.min(volume + 0.1, 1);
            setVolume(newVolume);
            if (videoRef.current) {
              videoRef.current.volume = newVolume;
              if (isMuted) {
                videoRef.current.muted = false;
                setIsMuted(false);
              }
            }
            localStorage.setItem("videoPlayerVolume", newVolume.toString());
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          // Decrease volume
          {
            const newVolume = Math.max(volume - 0.1, 0);
            setVolume(newVolume);
            if (videoRef.current) {
              videoRef.current.volume = newVolume;
            }
            localStorage.setItem("videoPlayerVolume", newVolume.toString());
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
  }, [selectedClip, isPlaying, duration, volume, isMuted, togglePlayPause]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      
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
      setCurrentTime(videoRef.current.currentTime);
    }
  };

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
    setIsSeeking(true);
    if (!videoRef.current || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = pos * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (!isSeeking) return;

    const handleMouseMove = (e) => {
      if (!videoRef.current || !progressBarRef.current || !duration) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pos * duration;
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
  }, [isSeeking, duration]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
                {formatTime(currentTime)} / {formatTime(duration)}
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

