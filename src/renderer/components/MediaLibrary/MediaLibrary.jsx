import React, { useState, useEffect, useRef } from "react";
import "./MediaLibrary.css";
import ScreenSourcePicker from "../ScreenSourcePicker/ScreenSourcePicker";
import CameraPicker from "../CameraPicker/CameraPicker";
import Toast from "../Toast/Toast";
import { useScreenRecording } from "../../hooks/useScreenRecording";
import { useWebcamRecording } from "../../hooks/useWebcamRecording";
import { useMediaStore } from "../../store/mediaStore";

/**
 * MediaLibrary Component
 * Displays imported video clips in a grid layout with thumbnails
 * Handles file import via button click or drag-and-drop
 */
function MediaLibrary({ onImport, onProcessFiles, isProcessing = false }) {
  const clips = useMediaStore((s) => s.clips);
  const selectedClipId = useMediaStore((s) => s.selectedClipId);
  const selectClip = useMediaStore((s) => s.selectClip);
  const removeMedia = useMediaStore((s) => s.removeMedia);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isRecordDropdownOpen, setIsRecordDropdownOpen] = useState(false);
  const [isScreenSourcePickerOpen, setIsScreenSourcePickerOpen] = useState(false);
  const [isCameraPickerOpen, setIsCameraPickerOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [notification, setNotification] = useState(null);
  const [webcamPreviewStream, setWebcamPreviewStream] = useState(null);
  const webcamPreviewRef = useRef(null);
  const [cameraSettings, setCameraSettings] = useState({
    resolution: "720p", // 720p or 1080p
    frameRate: 30, // 30 or 60
    mirror: false, // horizontal flip
  });

  // Screen recording hook
  const screenRecording = useScreenRecording();
  
  // Webcam recording hook
  const webcamRecording = useWebcamRecording();

  // Use the appropriate recording hook based on selected source type
  const activeRecording = selectedSource?.type === "camera" ? webcamRecording : screenRecording;
  
  const {
    isRecording,
    isPaused,
    recordingTime,
    formattedTime,
    error: recordingError,
    isMicEnabled,
    micPermissionDenied,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    toggleMicrophone,
    cleanup,
  } = activeRecording;

  // Show notification helper
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleImportClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (onImport) {
      onImport();
    }
  };

  const handleRecordClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsRecordDropdownOpen(!isRecordDropdownOpen);
  };

  const handleRecordOptionSelect = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("Record option selected:", option);
    setIsRecordDropdownOpen(false);
    
    if (option === "screen") {
      setIsScreenSourcePickerOpen(true);
    } else if (option === "webcam") {
      setIsCameraPickerOpen(true);
    } else if (option === "both") {
      // TODO: Implement both screen and webcam recording
      console.log("Both screen and webcam recording not yet implemented");
    }
  };

  const handleScreenSourceSelect = (source) => {
    console.log("Screen source selected:", source);
    setSelectedSource(source);
    setIsScreenSourcePickerOpen(false);
  };

  const countdownIntervalRef = useRef(null);

  const handleStartRecording = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedSource) return;

    // Clean up preview stream if it exists (for webcam)
    if (webcamPreviewStream) {
      webcamPreviewStream.getTracks().forEach(track => track.stop());
      setWebcamPreviewStream(null);
    }

    // Start recording immediately (no countdown for MVP)
    try {
      const recordingOptions = {
        bitrate: 2500000, // 2.5 Mbps
        includeMicrophone: isMicEnabled,
      };

      // Add webcam-specific options with user settings
      if (selectedSource.type === "camera") {
        const resolution = cameraSettings.resolution === "1080p" ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
        recordingOptions.width = resolution.width;
        recordingOptions.height = resolution.height;
        recordingOptions.frameRate = cameraSettings.frameRate;
      }

      await startRecording(selectedSource.id, recordingOptions);
    } catch (error) {
      console.error("Failed to start recording:", error);
      
      const recordingType = selectedSource.type === "camera" ? "Webcam" : "Screen";
      
      if (error.message.includes("Permission denied")) {
        showNotification(`${recordingType} recording permission denied. Please allow access in your system settings.`, "error");
      } else if (error.message.includes("not allowed")) {
        showNotification(`${recordingType} recording not allowed. Check your browser/system permissions.`, "error");
      } else {
        showNotification("Failed to start recording. Please try again.", "error");
      }
      
      setSelectedSource(null);
    }
  };

  const handleMicToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMicrophone();
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleStopRecording = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const blob = await stopRecording();
      console.log("Recording stopped, blob size:", blob.size);
      
      if (blob.size === 0) {
        console.error("Recording is empty, not saving");
        showNotification("Recording is empty. Please try recording again.", "error");
        setSelectedSource(null);
        return;
      }
      
      // Generate filename with timestamp
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const prefix = selectedSource?.type === "camera" ? "webcam-recording" : "screen-recording";
      const filename = `${prefix}-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.webm`;
      
      console.log("Saving recording as:", filename);
      showNotification("Saving and processing recording...", "info");
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();
      
      // Save to disk using Electron IPC (this will also fix WebM duration)
      const saveResult = await window.electron.recording.saveRecording(arrayBuffer, filename);
      
      if (saveResult.success) {
        console.log("Recording saved successfully:", saveResult.filePath);
        
        // Process the saved file and add to media library
        if (onProcessFiles) {
          console.log("Processing recording and adding to library...");
          
          try {
            // Use onProcessFiles directly with the file path
            await onProcessFiles([saveResult.filePath]);
            console.log("Recording added to media library");
            showNotification("Recording saved to library!", "success");
          } catch (error) {
            console.error("Failed to process recording:", error);
            showNotification("Recording saved but failed to process. You can import it manually.", "warning");
          }
        }
        
        setSelectedSource(null);
      } else {
        console.error("Failed to save recording:", saveResult.error);
        showNotification("Failed to save recording. Please try again.", "error");
        setSelectedSource(null);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      showNotification("Failed to stop recording. Please try again.", "error");
      setSelectedSource(null);
    }
  };

  const handleCancelRecording = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Clean up preview stream
    if (webcamPreviewStream) {
      webcamPreviewStream.getTracks().forEach(track => track.stop());
      setWebcamPreviewStream(null);
    }
    
    // Clear selected source
    setSelectedSource(null);
  };

  // Show recording errors from hook
  useEffect(() => {
    if (recordingError) {
      showNotification(recordingError, "error");
    }
  }, [recordingError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      
      // Clean up webcam preview stream
      if (webcamPreviewStream) {
        webcamPreviewStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update video preview when stream changes
  useEffect(() => {
    if (webcamPreviewRef.current && webcamPreviewStream) {
      webcamPreviewRef.current.srcObject = webcamPreviewStream;
    }
  }, [webcamPreviewStream]);

  const handleScreenSourcePickerClose = () => {
    setIsScreenSourcePickerOpen(false);
  };

  const handleCameraSelect = async (camera) => {
    console.log("Camera selected:", camera);
    
    // Start preview stream for the selected camera with current settings
    await updateCameraPreview(camera, cameraSettings);
  };

  const updateCameraPreview = async (camera, settings) => {
    // Stop existing preview stream if any
    if (webcamPreviewStream) {
      webcamPreviewStream.getTracks().forEach(track => track.stop());
      setWebcamPreviewStream(null);
    }

    // Determine resolution
    const resolution = settings.resolution === "1080p" ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: { exact: camera.deviceId },
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          frameRate: { ideal: settings.frameRate }
        }
      });
      
      setWebcamPreviewStream(stream);
      setSelectedSource({
        id: camera.deviceId,
        name: camera.label || `Camera ${camera.deviceId}`,
        type: "camera",
        device: camera
      });
      setIsCameraPickerOpen(false);
      
      // Set the preview stream on the video element
      if (webcamPreviewRef.current) {
        webcamPreviewRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Failed to start webcam preview:", error);
      
      // Show specific error messages
      let errorMessage = "Failed to access camera.";
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Camera permission denied. Please allow camera access in your system settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "Camera not found. Please check your camera connection.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorMessage = "Camera is in use by another application. Please close other apps and try again.";
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera does not support the requested settings. Try a different camera or lower settings.";
      } else if (error.name === "AbortError") {
        errorMessage = "Camera access was interrupted. Please try again.";
      }
      
      showNotification(errorMessage, "error");
    }
  };

  const handleCameraPickerClose = () => {
    setIsCameraPickerOpen(false);
  };

  const handleCameraSettingChange = async (setting, value) => {
    const newSettings = { ...cameraSettings, [setting]: value };
    setCameraSettings(newSettings);
    
    // If we have a selected camera and preview, update the preview with new settings
    if (selectedSource?.type === "camera" && selectedSource.device) {
      await updateCameraPreview(selectedSource.device, newSettings);
    }
  };

  const handleClipClick = (clip) => {
    selectClip(clip.id);
  };

  const handleRevealInExplorer = async (filePath) => {
    if (!filePath) return;
    try {
      await window.electron.fileSystem.revealInExplorer(filePath);
    } catch (error) {
      console.error("Failed to reveal file in explorer:", error);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only show drop indicator if files are being dragged
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only hide drop indicator when leaving the component entirely
    // Check if the related target is outside the library content
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    // Handle dropped files
    const files = Array.from(event.dataTransfer.files);
    
    // Filter for video files only
    const videoFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop();
      return ["mp4", "mov", "webm"].includes(ext);
    });

    if (videoFiles.length > 0 && onImport) {
      onImport(videoFiles);
    } else if (files.length > 0 && videoFiles.length === 0) {
      console.warn("No supported video files found. Supported formats: MP4, MOV, WebM");
    }
  };

  const handleContextMenu = (event, clip) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      clip,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleRemoveClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (contextMenu) {
      removeMedia(contextMenu.clip.id);
    }
    closeContextMenu();
  };

  const handleRevealClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (contextMenu) {
      handleRevealInExplorer(contextMenu.clip.filePath);
    }
    closeContextMenu();
  };

  // Close context menu when clicking anywhere
  useEffect(() => {
    if (contextMenu) {
      const handleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
      };
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Close record dropdown when clicking outside
  useEffect(() => {
    if (isRecordDropdownOpen) {
      const handleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.target;
        if (!target.closest('.record-button-container')) {
          setIsRecordDropdownOpen(false);
        }
      };
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [isRecordDropdownOpen]);

  return (
    <aside className="media-library">
      {/* Countdown Overlay */}
      {showCountdown && (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <div className="countdown-number">{countdown > 0 ? countdown : "GO!"}</div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="toast-container">
          <Toast
            message={notification.message}
            type={notification.type}
            duration={4000}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      <div className="panel-header">
        <h2>Media Library</h2>
        <div className="header-buttons">
          <button 
            className="btn-primary" 
            onClick={handleImportClick}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "+ Import"}
          </button>
        </div>
      </div>

      {/* Record Button Section */}
      <div className="record-section">
        <div className="record-button-container">
          <button 
            className={`btn-record ${isRecording ? "recording" : ""}`}
            onClick={handleRecordClick}
            disabled={isProcessing || isRecording}
            title={isRecording ? "Recording in progress" : "Record screen, webcam, or both"}
          >
            <span className="record-icon"></span>
            <span>Record</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          {isRecordDropdownOpen && (
            <div className="record-dropdown">
              <div 
                className="record-dropdown-item" 
                onClick={(event) => handleRecordOptionSelect(event, "screen")}
              >
                <span className="dropdown-icon">🖥️</span>
                <span>Screen</span>
              </div>
              <div 
                className="record-dropdown-item" 
                onClick={(event) => handleRecordOptionSelect(event, "webcam")}
              >
                <span className="dropdown-icon">📹</span>
                <span>Webcam</span>
              </div>
              <div 
                className="record-dropdown-item" 
                onClick={(event) => handleRecordOptionSelect(event, "both")}
              >
                <span className="dropdown-icon">🎬</span>
                <span>Both</span>
              </div>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        {selectedSource && (
          <div className="recording-controls">
            <div className="recording-info">
              {isRecording ? (
                <span className="recording-status">
                  <span className="recording-indicator"></span>
                  Recording: {formattedTime}
                </span>
              ) : (
                <span className="recording-status">
                  Ready: {selectedSource.name}
                </span>
              )}
              {micPermissionDenied && (
                <span className="mic-warning" title="Microphone access denied. Recording without audio.">
                  ⚠️ No mic access
                </span>
              )}
            </div>
            
            {/* Webcam Preview (shown before recording starts) */}
            {selectedSource.type === "camera" && !isRecording && webcamPreviewStream && (
              <div className="webcam-preview-container">
                <video
                  ref={webcamPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="webcam-preview"
                  style={{ transform: cameraSettings.mirror ? 'scaleX(-1)' : 'none' }}
                />
                <div className="preview-label">Preview</div>
              </div>
            )}
            
            {/* Camera Settings (shown before recording starts) */}
            {selectedSource.type === "camera" && !isRecording && (
              <div className="camera-settings">
                <div className="camera-setting">
                  <label>Resolution:</label>
                  <select 
                    value={cameraSettings.resolution} 
                    onChange={(event) => handleCameraSettingChange("resolution", event.target.value)}
                  >
                    <option value="720p">720p (1280x720)</option>
                    <option value="1080p">1080p (1920x1080)</option>
                  </select>
                </div>
                <div className="camera-setting">
                  <label>Frame Rate:</label>
                  <select 
                    value={cameraSettings.frameRate} 
                    onChange={(event) => handleCameraSettingChange("frameRate", parseInt(event.target.value))}
                  >
                    <option value="30">30 fps</option>
                    <option value="60">60 fps</option>
                  </select>
                </div>
                <div className="camera-setting">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={cameraSettings.mirror} 
                      onChange={(event) => handleCameraSettingChange("mirror", event.target.checked)}
                    />
                    <span>Mirror video</span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="recording-buttons">
              {!isRecording ? (
                <>
                  <button
                    className={`btn-mic-toggle ${isMicEnabled ? "enabled" : "disabled"}`}
                    onClick={handleMicToggle}
                    disabled={isProcessing}
                    title={isMicEnabled ? "Microphone enabled" : "Microphone disabled"}
                  >
                    <span className="mic-icon">🎤</span>
                    {!isMicEnabled && <span className="mic-disabled-overlay">✕</span>}
                  </button>
                  <button
                    className="btn-record-start"
                    onClick={handleStartRecording}
                    disabled={isProcessing}
                  >
                    ▶ Start Recording
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={handleCancelRecording}
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-record-pause"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isPaused) {
                        resumeRecording();
                      } else {
                        pauseRecording();
                      }
                    }}
                  >
                    {isPaused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                  <button
                    className="btn-record-stop"
                    onClick={handleStopRecording}
                  >
                    ⏹ Stop
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className={`library-content ${isDragging ? "dragging" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {clips.length === 0 ? (
          <div className="placeholder-content">
            <div className="placeholder-icon">📁</div>
            <p>No media files yet</p>
            <p className="placeholder-hint">
              Import videos or drag & drop files here
            </p>
          </div>
        ) : (
          <div className="clips-grid">
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                isSelected={clip.id === selectedClipId}
                onClick={() => handleClipClick(clip)}
                onContextMenu={(e) => handleContextMenu(e, clip)}
              />
            ))}
          </div>
        )}

        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-overlay-content">
              <div className="drop-icon">📥</div>
              <p>Drop videos here to import</p>
            </div>
          </div>
        )}

        {contextMenu && (
          <div
            className="context-menu"
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-item" onClick={handleRevealClick}>
              <span className="context-menu-icon">📁</span>
              <span>Reveal in {window.electron.platform === 'darwin' ? 'Finder' : 'Explorer'}</span>
            </div>
            <div className="context-menu-divider"></div>
            <div className="context-menu-item danger" onClick={handleRemoveClick}>
              <span className="context-menu-icon">🗑️</span>
              <span>Remove from Library</span>
            </div>
          </div>
        )}
      </div>

      {/* Screen Source Picker Modal */}
      <ScreenSourcePicker
        isOpen={isScreenSourcePickerOpen}
        onSelect={handleScreenSourceSelect}
        onClose={handleScreenSourcePickerClose}
      />

      {/* Camera Picker Modal */}
      <CameraPicker
        isOpen={isCameraPickerOpen}
        onSelect={handleCameraSelect}
        onClose={handleCameraPickerClose}
      />
    </aside>
  );
}

/**
 * ClipCard Component
 * Individual clip card showing thumbnail, filename, and metadata
 */
function ClipCard({ clip, isSelected, onClick, onContextMenu }) {
  const [isDragging, setIsDragging] = React.useState(false);

  const formatDuration = (seconds) => {
    // Convert to number if it's a string
    const duration = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    
    // Handle invalid or missing duration
    if (duration == null || isNaN(duration) || duration < 0) {
      return "0:00";
    }
    
    const minutes = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(clip));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`clip-card ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={clip.filename}
    >
      <div className="clip-thumbnail">
        {clip.thumbnail ? (
          <img src={clip.thumbnail} alt={clip.filename} />
        ) : (
          <div className="thumbnail-placeholder">
            <span>🎬</span>
          </div>
        )}
        {clip.duration && (
          <div className="duration-badge">{formatDuration(clip.duration)}</div>
        )}
      </div>

      <div className="clip-info">
        <div className="clip-filename" title={clip.filename}>
          {clip.filename}
        </div>
        {clip.resolution && (
          <div className="clip-metadata">
            <span className="metadata-item">
              {clip.resolution.width}×{clip.resolution.height}
            </span>
            {clip.fileSize && (
              <span className="metadata-item">
                {formatFileSize(clip.fileSize)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaLibrary;

