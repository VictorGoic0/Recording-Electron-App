import React, { useRef, useState, useEffect, useCallback } from "react";
import "./VideoPlayer.css";
import { useMediaStore } from "../../store/mediaStore";
import { usePlaybackStore } from "../../store/playbackStore";

/**
 * VideoPlayer Component
 * HTML5 video player with custom controls for previewing clips.
 *
 * IMPORTANT: Uses custom 'local-video://' protocol registered in main.js
 * to securely load local video files without triggering Electron's
 * file:// security restrictions.
 *
 * Phase 2: All playback state (currentTime, duration, isPlaying, isSeeking)
 * lives in usePlaybackStore. No props except onShowToast.
 * setCurrentTime is atomic — writes both currentTime and playhead together,
 * eliminating the callback chain and the race conditions it caused.
 */
function VideoPlayer({ onShowToast }) {
  const selectedMediaClip = useMediaStore((s) =>
    s.clips.find((c) => c.id === s.selectedClipId) ?? null
  );
  const selectedTimelineClip = usePlaybackStore((s) =>
    s.tracks.flatMap((t) => t.clips).find((c) => c.id === s.selectedTimelineClipId) ?? null
  );
  const tracks = usePlaybackStore((s) => s.tracks);

  // Store-backed playback state
  const playhead = usePlaybackStore((s) => s.playhead);
  const duration = usePlaybackStore((s) => s.duration);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isSeeking = usePlaybackStore((s) => s.isSeeking);
  const setCurrentTime = usePlaybackStore((s) => s.setCurrentTime);
  const setDuration = usePlaybackStore((s) => s.setDuration);
  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying);
  const setIsSeeking = usePlaybackStore((s) => s.setIsSeeking);

  // UI-local state — no other component needs these
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const overlayVideoRefs = useRef([]);
  const progressBarRef = useRef(null);
  // Guard flag: prevents VideoPlayer from re-seeking the video element in response
  // to a store update that VideoPlayer itself triggered (feedback loop prevention).
  const seekingFromVideoRef = useRef(false);

  const selectedClip = selectedTimelineClip || selectedMediaClip;
  const isTimelineClip = !!selectedTimelineClip;

  const hasOverlayClips =
    tracks &&
    (tracks.find((t) => t.id === "overlay")?.clips.length > 0 ||
      tracks.find((t) => t.id === "overlay2")?.clips.length > 0);
  const isMultiTrackMode = hasOverlayClips && !selectedMediaClip;

  const trimStart = isTimelineClip ? selectedTimelineClip.trimStart || 0 : 0;
  const trimEnd = isTimelineClip
    ? selectedTimelineClip.trimEnd || selectedClip?.duration || 0
    : selectedClip?.duration || 0;

  const getOverlayClips = () => {
    if (!isMultiTrackMode || !tracks) return [];
    const overlays = [];
    const overlayTrack = tracks.find((t) => t.id === "overlay");
    const overlay2Track = tracks.find((t) => t.id === "overlay2");
    if (overlayTrack) overlayTrack.clips.forEach((c) => overlays.push({ ...c, trackId: "overlay" }));
    if (overlay2Track) overlay2Track.clips.forEach((c) => overlays.push({ ...c, trackId: "overlay2" }));
    return overlays;
  };

  const overlayClips = getOverlayClips();

  // ── External seek: when the store's playhead changes due to timeline drag,
  // seek the video element to match. The seekingFromVideoRef guard prevents this
  // from firing when the video itself is the source of the playhead update.
  useEffect(() => {
    if (!videoRef.current) return;
    if (seekingFromVideoRef.current) return;

    if (!isFinite(playhead) || isNaN(playhead)) return;

    if (Math.abs(videoRef.current.currentTime - playhead) > 0.1) {
      videoRef.current.currentTime = playhead;
    }

    overlayVideoRefs.current.forEach((overlayVideo) => {
      if (overlayVideo && Math.abs(overlayVideo.currentTime - playhead) > 0.1) {
        overlayVideo.currentTime = playhead;
      }
    });
  }, [playhead, selectedClip]);

  // ── Overlay sync: keep overlay videos in sync with main video play state
  useEffect(() => {
    if (!videoRef.current || overlayClips.length === 0) return;

    const mainVideo = videoRef.current;

    const syncOverlays = () => {
      overlayVideoRefs.current.forEach((overlayVideo) => {
        if (!overlayVideo) return;
        if (isPlaying && overlayVideo.paused) {
          overlayVideo.play().catch((err) => console.warn("Overlay play failed:", err));
        } else if (!isPlaying && !overlayVideo.paused) {
          overlayVideo.pause();
        }
        if (Math.abs(overlayVideo.currentTime - mainVideo.currentTime) > 0.2) {
          overlayVideo.currentTime = mainVideo.currentTime;
        }
      });
    };

    syncOverlays();
    const syncInterval = setInterval(syncOverlays, 100);
    return () => clearInterval(syncInterval);
  }, [isPlaying, overlayClips.length]);

  // ── Load new clip source when selected clip changes
  useEffect(() => {
    if (!selectedClip) {
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setError(null);

      if (!selectedClip.filePath) {
        console.error("Selected clip has no file path:", selectedClip);
        setError("Video file path is missing");
        if (onShowToast) onShowToast("Video file path is missing. Please select another clip.", "error");
        return;
      }

      let videoSrc = selectedClip.filePath;
      if (!videoSrc.startsWith("local-video:") && !videoSrc.startsWith("blob:")) {
        const normalizedPath = videoSrc.replace(/\\/g, "/");
        videoSrc = `local-video://load?path=${encodeURIComponent(normalizedPath)}`;
      }

      videoRef.current.src = videoSrc;
      videoRef.current.load();
    }
  }, [selectedClip?.filePath, selectedClip?.id]);

  // ── Trim boundary enforcement: seek into bounds if trim changes move them
  useEffect(() => {
    if (!videoRef.current || !isTimelineClip) return;
    const ct = videoRef.current.currentTime;
    if (ct < trimStart) videoRef.current.currentTime = trimStart;
    else if (ct > trimEnd) videoRef.current.currentTime = trimStart;
  }, [isTimelineClip, trimStart, trimEnd]);

  // ── Restore saved volume on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem("videoPlayerVolume");
    if (savedVolume !== null) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
      if (videoRef.current) videoRef.current.volume = vol;
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
        const msg = "Failed to play video";
        setError(msg);
        if (onShowToast) onShowToast(msg, "error");
      });
      setIsPlaying(true);
    }
  }, [selectedClip, isPlaying, setIsPlaying]);

  const handleKeyDown = (e) => {
    if (!videoRef.current) return;

    const videoControlKeys = [" ", "k", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (videoControlKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    switch (e.key) {
      case " ":
      case "k":
        togglePlayPause();
        break;
      case "ArrowLeft":
        if (videoRef.current.duration > 0) {
          // Read directly from video element — never stale, no closed-over local state
          const newTime = Math.max(videoRef.current.currentTime - 10, 0);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
        break;
      case "ArrowRight":
        if (videoRef.current.duration > 0) {
          const newTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
        break;
      case "ArrowUp":
        setVolume((prev) => {
          const newVolume = Math.min(prev + 0.1, 1);
          if (videoRef.current) {
            videoRef.current.volume = newVolume;
            videoRef.current.muted = false;
          }
          setIsMuted(false);
          localStorage.setItem("videoPlayerVolume", newVolume.toString());
          return newVolume;
        });
        break;
      case "ArrowDown":
        setVolume((prev) => {
          const newVolume = Math.max(prev - 0.1, 0);
          if (videoRef.current) videoRef.current.volume = newVolume;
          localStorage.setItem("videoPlayerVolume", newVolume.toString());
          return newVolume;
        });
        break;
      default:
        break;
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const videoDuration = videoRef.current.duration;

    if (!isFinite(videoDuration) || isNaN(videoDuration) || videoDuration <= 0) {
      console.warn("VideoPlayer: Invalid duration from video element", { duration: videoDuration, selectedClip });
      setDuration(0);
    } else {
      setDuration(videoDuration);
    }

    if (videoRef.current.videoWidth === 0 && videoRef.current.videoHeight === 0) {
      const msg = "Audio-only files are not supported. Please use a video file.";
      setError(msg);
      if (onShowToast) onShowToast(msg, "warning");
    }

    if (isTimelineClip && trimStart > 0) {
      videoRef.current.currentTime = trimStart;
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const newTime = videoRef.current.currentTime;

    if (isTimelineClip && newTime >= trimEnd) {
      videoRef.current.pause();
      videoRef.current.currentTime = trimEnd;
      setIsPlaying(false);
      // Atomic write — updates both currentTime and playhead
      setCurrentTime(trimEnd);
      return;
    }

    // Flag that this store update originates from the video element,
    // so the external-seek effect won't loop back and re-seek.
    seekingFromVideoRef.current = true;
    setCurrentTime(newTime);
    // Reset flag after the current microtask queue flushes
    Promise.resolve().then(() => { seekingFromVideoRef.current = false; });
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleError = (e) => {
    console.error("[VideoPlayer] Video player error:", e);
    if (videoRef.current?.error) {
      const { code, message } = videoRef.current.error;
      const errorMessages = {
        1: "Video loading was aborted",
        2: "Network error while loading video",
        3: "Video decoding failed - file may be corrupted or use an unsupported format",
        4: "Video format not supported or file not found",
      };
      const msg = errorMessages[code] || "Unable to load video";
      console.error("[VideoPlayer] Media Error Details:", { code, message, src: videoRef.current.src });
      setError(msg);
      if (onShowToast) onShowToast(msg, "error");
    } else {
      const msg = "Failed to load video. File may be corrupted or in an unsupported format.";
      setError(msg);
      if (onShowToast) onShowToast(msg, "error");
    }
    setIsPlaying(false);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
    localStorage.setItem("videoPlayerVolume", newVolume.toString());
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const seekToPosition = (clientX) => {
    if (!videoRef.current || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = isTimelineClip
      ? trimStart + pos * (trimEnd - trimStart)
      : pos * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleProgressBarMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSeeking(true);
    seekToPosition(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isSeeking) return;
    e.preventDefault();
    e.stopPropagation();
    seekToPosition(e.clientX);
  };

  const handleMouseUp = (e) => {
    if (isSeeking) {
      e.preventDefault();
      e.stopPropagation();
      setIsSeeking(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayDuration = isTimelineClip ? trimEnd - trimStart : duration;
  const displayCurrentTime = isTimelineClip ? Math.max(0, currentTime - trimStart) : currentTime;
  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0;

  return (
    <section
      className="video-preview"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ outline: "none" }}
    >
      <div className="panel-header">
        <h2>Preview</h2>
        {selectedClip && <span className="preview-filename">{selectedClip.filename}</span>}
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
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
              />

              {overlayClips.map((overlayClip, index) => {
                const videoSrc =
                  overlayClip.filePath?.startsWith("local-video:") ||
                  overlayClip.filePath?.startsWith("blob:")
                    ? overlayClip.filePath
                    : `local-video://load?path=${encodeURIComponent(
                        overlayClip.filePath?.replace(/\\/g, "/") || ""
                      )}`;

                const position =
                  overlayClip.trackId === "overlay"
                    ? { bottom: "80px", right: "20px" }
                    : { bottom: "80px", left: "20px" };

                return (
                  <video
                    key={`${overlayClip.id}-${index}`}
                    ref={(el) => (overlayVideoRefs.current[index] = el)}
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
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
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
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  <div className="progress-bar-handle" style={{ left: `${progress}%` }} />
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
