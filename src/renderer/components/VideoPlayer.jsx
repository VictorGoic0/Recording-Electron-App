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
function VideoPlayer({ selectedClip }) {
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
        setError("Failed to load video. File may have been moved or deleted.");
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
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedClip, isPlaying]); // Re-attach when selectedClip or isPlaying changes

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      console.log("[VideoPlayer] Metadata loaded, duration:", videoRef.current.duration);
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
        1: "MEDIA_ERR_ABORTED: Video loading was aborted",
        2: "MEDIA_ERR_NETWORK: Network error while loading video",
        3: "MEDIA_ERR_DECODE: Video decoding failed (corrupted or unsupported format)",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED: Video format not supported or source not found",
      };
      
      const detailedError = errorMessages[errorCode] || `Unknown error (code: ${errorCode})`;
      console.error("[VideoPlayer] Media Error Details:", {
        code: errorCode,
        message: errorMessage,
        description: detailedError,
        src: videoRef.current.src,
      });
      
      setError(`Failed to load video: ${detailedError}`);
    } else {
      setError("Failed to load video. File may be corrupted or in an unsupported format.");
    }
    
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!videoRef.current || !selectedClip) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((err) => {
        console.error("Play error:", err);
        setError("Failed to play video");
      });
      setIsPlaying(true);
    }
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

  const seekToPosition = useCallback((clientX) => {
    if (!videoRef.current || !progressBarRef.current || !duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = pos * duration;

    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const handleProgressBarMouseDown = (e) => {
    console.log("[VideoPlayer] Progress bar mouse down");
    setIsSeeking(true);
    seekToPosition(e.clientX);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (!isSeeking) return;

    console.log("[VideoPlayer] Seeking started - attaching global listeners");

    const handleMouseMove = (e) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      console.log("[VideoPlayer] Seeking ended");
      setIsSeeking(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSeeking, duration, seekToPosition]);

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

