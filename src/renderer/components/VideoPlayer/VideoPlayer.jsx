import React, { useRef, useState, useEffect } from "react";
import "./VideoPlayer.css";
import { useMediaStore } from "../../store/mediaStore";
import { usePlaybackStore } from "../../store/playbackStore";

/**
 * VideoPlayer Component
 *
 * The <video> element is always mounted so videoRef.current is never null
 * after the initial render. Visibility is controlled via CSS, not conditional
 * rendering, eliminating the mount-race between clip selection and ref availability.
 *
 * All video event listeners (loadedmetadata, timeupdate, ended, error) are attached
 * imperatively inside the clip-load effect and removed on cleanup. This means
 * no listeners fire before a clip is intentionally loaded — eliminating spurious
 * error events on the empty <video> at mount time.
 *
 * All imperative operations read videoRef.current directly, never closed-over
 * store values, to avoid stale closure bugs.
 *
 * IMPORTANT: Uses 'local-video://' protocol registered in main.js to securely
 * load local video files without triggering Electron's file:// restrictions.
 */
function VideoPlayer({ onShowToast }) {
  const selectedMediaClip = useMediaStore((s) =>
    s.clips.find((c) => c.id === s.selectedMediaLibraryClipId) ?? null
  );
  const selectedTimelineClip = usePlaybackStore((s) =>
    s.tracks.flatMap((t) => t.clips).find((c) => c.id === s.selectedTimelineClipId) ?? null
  );
  const tracks = usePlaybackStore((s) => s.tracks);

  const duration = usePlaybackStore((s) => s.duration);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const pendingSeek = usePlaybackStore((s) => s.pendingSeek);
  const setDuration = usePlaybackStore((s) => s.setDuration);
  const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying);
  const setPlayheadFromVideo = usePlaybackStore((s) => s.setPlayheadFromVideo);
  const clearPendingSeek = usePlaybackStore((s) => s.clearPendingSeek);

  const [readOnlyCurrentTime, setReadOnlyCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const overlayVideoRefs = useRef([]);
  const progressBarRef = useRef(null);
  const rafIdRef = useRef(null);

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

  // ── Mount: restore saved volume — ref is always valid here
  useEffect(() => {
    const savedVolume = localStorage.getItem("videoPlayerVolume");
    if (savedVolume !== null) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
      videoRef.current.volume = vol;
    }
  }, []);

  // ── Clip load: set src, attach listeners, call load() — all in one place.
  // Listeners are removed on cleanup so nothing fires on an unloaded element.
  useEffect(() => {
    const video = videoRef.current;

    // Reset state and detach any previous src when no clip is selected
    if (!selectedClip) {
      video.pause();
      video.src = "";
      setIsPlaying(false);
      setReadOnlyCurrentTime(0);
      setDuration(0);
      setError(null);
      return;
    }

    if (!selectedClip.filePath) {
      setError("Video file path is missing");
      if (onShowToast) onShowToast("Video file path is missing. Please select another clip.", "error");
      return;
    }

    // Reset playback state before loading new src
    video.pause();
    setIsPlaying(false);
    setReadOnlyCurrentTime(0);
    setError(null);
    // ── Event handlers — defined here so they close over the correct clip context
    const onLoadedMetadata = () => {
      const videoDuration = video.duration;
      if (!isFinite(videoDuration) || isNaN(videoDuration) || videoDuration <= 0) {
        console.warn("[VideoPlayer] Invalid duration", { videoDuration });
        setDuration(0);
        return;
      }
      setDuration(videoDuration);
      if (video.videoWidth === 0 && video.videoHeight === 0) {
        const msg = "Audio-only files are not supported. Please use a video file.";
        setError(msg);
        if (onShowToast) onShowToast(msg, "warning");
      }
      if (isTimelineClip && trimStart > 0) {
        video.currentTime = trimStart;
      }
    };

    const onTimeUpdate = () => {
      const newTime = video.currentTime;
      if (isTimelineClip && newTime >= trimEnd) {
        video.pause();
        video.currentTime = trimEnd;
        setIsPlaying(false);
        setReadOnlyCurrentTime(trimEnd);
        // Sync playhead on trim boundary hit — cancel any pending RAF first
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        setPlayheadFromVideo(trimEnd);
        return;
      }
      setReadOnlyCurrentTime(newTime);
      // Throttle playhead store writes to one per animation frame to avoid
      // flooding Zustand with 60+ updates/sec during playback.
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        setPlayheadFromVideo(video.currentTime);
      });
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    const onError = () => {
      const errorMessages = {
        1: "Video loading was aborted",
        2: "Network error while loading video",
        3: "Video decoding failed — file may be corrupted or use an unsupported codec",
        4: "Video format not supported or file not found",
      };
      const msg = video.error
        ? errorMessages[video.error.code] || "Unable to load video"
        : "Failed to load video. File may be corrupted or in an unsupported format.";
      setError(msg);
      if (onShowToast) onShowToast(msg, "error");
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    let videoSrc = selectedClip.filePath;
    if (!videoSrc.startsWith("local-video:") && !videoSrc.startsWith("blob:")) {
      const normalizedPath = videoSrc.replace(/\\/g, "/");
      videoSrc = `local-video://load?path=${encodeURIComponent(normalizedPath)}`;
    }

    video.src = videoSrc;
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [selectedClip?.filePath, selectedClip?.id]);

  // ── Trim boundary enforcement
  useEffect(() => {
    if (!isTimelineClip) return;
    const video = videoRef.current;
    const ct = video.currentTime;
    if (ct < trimStart) video.currentTime = trimStart;
    else if (ct > trimEnd) video.currentTime = trimStart;
  }, [isTimelineClip, trimStart, trimEnd]);

  // ── External seek (Timeline playhead drag → video)
  // Only fires when pendingSeek is non-null (set by setPlayhead, not setPlayheadFromVideo).
  // Clears immediately after applying so the effect doesn't re-run.
  useEffect(() => {
    if (pendingSeek === null) return;
    const video = videoRef.current;
    if (!video || video.duration <= 0) {
      clearPendingSeek();
      return;
    }
    video.currentTime = pendingSeek;
    setReadOnlyCurrentTime(pendingSeek);
    clearPendingSeek();
  }, [pendingSeek]);

  // ── Overlay sync
  useEffect(() => {
    if (overlayClips.length === 0) return;
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

  // ── Controls

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video || !selectedClip) return;
    if (video.paused) {
      video.play().catch((err) => {
        console.error("[VideoPlayer] Play error:", err);
        const msg = "Failed to play video";
        setError(msg);
        if (onShowToast) onShowToast(msg, "error");
      });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const seekToPosition = (clientX) => {
    const video = videoRef.current;
    const bar = progressBarRef.current;
    if (!video || !bar || video.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = isTimelineClip
      ? trimStart + pos * (trimEnd - trimStart)
      : pos * video.duration;
    video.currentTime = time;
    setReadOnlyCurrentTime(time);
  };

  const handleProgressBarMouseDown = (e) => {
    e.preventDefault();
    setIsSeeking(true);
    seekToPosition(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isSeeking) return;
    e.preventDefault();
    seekToPosition(e.clientX);
  };

  const handleMouseUp = (e) => {
    if (!isSeeking) return;
    e.preventDefault();
    setIsSeeking(false);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    localStorage.setItem("videoPlayerVolume", newVolume.toString());
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleKeyDown = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const handled = [" ", "k", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (handled.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    switch (e.key) {
      case " ":
      case "k":
        togglePlayPause();
        break;
      case "ArrowLeft": {
        if (video.duration <= 0) break;
        const newTime = Math.max(video.currentTime - 10, isTimelineClip ? trimStart : 0);
        video.currentTime = newTime;
        setReadOnlyCurrentTime(newTime);
        break;
      }
      case "ArrowRight": {
        if (video.duration <= 0) break;
        const newTime = Math.min(video.currentTime + 10, isTimelineClip ? trimEnd : video.duration);
        video.currentTime = newTime;
        setReadOnlyCurrentTime(newTime);
        break;
      }
      case "ArrowUp": {
        const newVolume = Math.min(video.volume + 0.1, 1);
        video.volume = newVolume;
        video.muted = false;
        setVolume(newVolume);
        setIsMuted(false);
        localStorage.setItem("videoPlayerVolume", newVolume.toString());
        break;
      }
      case "ArrowDown": {
        const newVolume = Math.max(video.volume - 0.1, 0);
        video.volume = newVolume;
        setVolume(newVolume);
        localStorage.setItem("videoPlayerVolume", newVolume.toString());
        break;
      }
      default:
        break;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayDuration = isTimelineClip ? trimEnd - trimStart : duration;
  const displayCurrentTime = isTimelineClip
    ? Math.max(0, readOnlyCurrentTime - trimStart)
    : readOnlyCurrentTime;
  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0;

  const showPlaceholder = !selectedClip && !error;
  const showError = !!error;
  const showPlayer = !!selectedClip && !error;

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
        {showPlaceholder && (
          <div className="placeholder-content">
            <div className="placeholder-icon">🎬</div>
            <p>No video selected</p>
            <p className="placeholder-hint">Select a clip from the media library</p>
          </div>
        )}

        {showError && (
          <div className="placeholder-content">
            <div className="placeholder-icon error">⚠️</div>
            <p>{error}</p>
            <p className="placeholder-hint">Try selecting a different clip</p>
          </div>
        )}

        {/* video element is always mounted — visibility toggled via CSS, never unmounted */}
        <div className="video-container" style={{ display: showPlayer ? "flex" : "none" }}>
          <video
            ref={videoRef}
            className="video-element"
            preload="auto"
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

        {showPlayer && (
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
              className={`progress-bar-container${isSeeking ? " is-seeking" : ""}`}
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
        )}
      </div>
    </section>
  );
}

export default VideoPlayer;
