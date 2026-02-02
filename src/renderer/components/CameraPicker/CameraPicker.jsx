import React, { useState, useEffect } from "react";
import "./CameraPicker.css";

/**
 * CameraPicker Component
 * Modal to select a camera device for webcam recording
 */
function CameraPicker({ isOpen, onSelect, onClose }) {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadCameras();
    } else {
      // Clean up previews when closing
      Object.values(previews).forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
      setPreviews({});
    }
    
    return () => {
      // Clean up on unmount
      Object.values(previews).forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request permission first by getting a stream
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices - labels will be available after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");

      console.log("Available cameras:", videoDevices);

      if (videoDevices.length === 0) {
        setError("No cameras detected. Please connect a camera and try again.");
        setLoading(false);
        return;
      }

      setCameras(videoDevices);
      
      // Auto-select first camera
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to enumerate cameras:", err);
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in your system settings and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera detected. Please connect a camera to your computer and try again.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("Camera is in use by another application. Please close other apps using the camera and try again.");
      } else if (err.name === "OverconstrainedError") {
        setError("Camera does not support the requested settings. Please try a different camera.");
      } else if (err.name === "AbortError") {
        setError("Camera access was interrupted. Please try again.");
      } else {
        setError(`Failed to access camera: ${err.message || "Unknown error"}. Please check your camera connection and permissions.`);
      }
      
      setLoading(false);
    }
  };

  const loadPreview = async (camera) => {
    // Check if preview already exists
    if (previews[camera.deviceId]) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: camera.deviceId } }
      });

      setPreviews(prev => ({
        ...prev,
        [camera.deviceId]: stream
      }));
    } catch (err) {
      console.error(`Failed to load preview for ${camera.label}:`, err);
      
      // Show specific error messages for preview failures
      let errorMessage = "";
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage = `${camera.label || "Camera"} is in use by another application.`;
      } else if (err.name === "NotAllowedError") {
        errorMessage = `Permission denied for ${camera.label || "camera"}.`;
      } else {
        errorMessage = `Could not load preview for ${camera.label || "camera"}.`;
      }
      
      // Store error state for this camera (optional: could show in UI)
      console.warn(errorMessage);
    }
  };

  const handleCameraClick = (camera) => {
    setSelectedCamera(camera);
    loadPreview(camera);
  };

  const handleSelect = () => {
    if (selectedCamera) {
      // Stop all preview streams
      Object.values(previews).forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      onSelect(selectedCamera);
    }
  };

  const handleClose = () => {
    // Stop all preview streams
    Object.values(previews).forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
    setPreviews({});
    onClose();
  };

  useEffect(() => {
    // Load preview for selected camera
    if (selectedCamera) {
      loadPreview(selectedCamera);
    }
  }, [selectedCamera]);

  if (!isOpen) return null;

  return (
    <div className="camera-picker-overlay" onClick={handleClose}>
      <div className="camera-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-picker-header">
          <h2>Select Camera</h2>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="camera-picker-content">
          {loading ? (
            <div className="camera-picker-loading">
              <div className="spinner"></div>
              <p>Loading cameras...</p>
            </div>
          ) : error ? (
            <div className="camera-picker-error">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button className="btn-retry" onClick={loadCameras}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="camera-list">
              {cameras.map((camera) => (
                <div
                  key={camera.deviceId}
                  className={`camera-item ${selectedCamera?.deviceId === camera.deviceId ? "selected" : ""}`}
                  onClick={() => handleCameraClick(camera)}
                >
                  <div className="camera-preview">
                    {previews[camera.deviceId] ? (
                      <video
                        autoPlay
                        muted
                        ref={(video) => {
                          if (video && previews[camera.deviceId]) {
                            video.srcObject = previews[camera.deviceId];
                          }
                        }}
                      />
                    ) : (
                      <div className="preview-placeholder">
                        <span>📹</span>
                      </div>
                    )}
                  </div>
                  <div className="camera-name">
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </div>
                  {selectedCamera?.deviceId === camera.deviceId && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="camera-picker-footer">
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSelect}
              disabled={!selectedCamera}
            >
              Select Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraPicker;

