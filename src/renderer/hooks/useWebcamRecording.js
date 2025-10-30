import { useState, useRef } from "react";

/**
 * Custom hook for webcam recording using MediaRecorder API
 */
export function useWebcamRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  /**
   * Check which codecs are supported
   */
  const getSupportedCodec = () => {
    const codecs = [
      { mimeType: "video/webm;codecs=vp9", name: "VP9" },
      { mimeType: "video/webm;codecs=vp8", name: "VP8" },
      { mimeType: "video/webm", name: "WebM (fallback)" },
    ];

    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec.mimeType)) {
        console.log(`Using codec: ${codec.name} (${codec.mimeType})`);
        return codec.mimeType;
      }
    }

    // Fallback - MediaRecorder will use default
    console.warn("No preferred codec supported, using default");
    return "";
  };

  /**
   * Start recording with the selected camera
   * @param {string} deviceId - Camera device ID
   * @param {object} options - Recording options (resolution, bitrate, etc.)
   */
  const startRecording = async (deviceId, options = {}) => {
    try {
      setError(null);
      setMicPermissionDenied(false);

      // Clear any existing interval before starting
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Configure video constraints
      const videoConstraints = {
        deviceId: { exact: deviceId },
        width: { ideal: options.width || 1280 },
        height: { ideal: options.height || 720 },
        frameRate: { ideal: options.frameRate || 30 },
      };

      // Request webcam stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      let combinedStream = videoStream;
      streamRef.current = videoStream;

      // Request microphone audio if enabled
      if (options.includeMicrophone !== false && isMicEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });

          // Combine video and audio streams
          combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);

          console.log("Microphone audio enabled for webcam recording");
        } catch (audioError) {
          console.warn("Microphone access denied or unavailable:", audioError);
          setMicPermissionDenied(true);
          // Continue with video-only recording
          combinedStream = videoStream;
        }
      }

      // Get supported codec
      const codec = getSupportedCodec();

      // Configure MediaRecorder options
      const recorderOptions = {
        mimeType: codec,
        videoBitsPerSecond: options.bitrate || 2500000, // 2.5 Mbps default
      };

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log(
          "Webcam recording stopped, total chunks:",
          chunksRef.current.length
        );
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Recording error occurred");
        stopRecording();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("Webcam recording started with device:", deviceId);
    } catch (err) {
      console.error("Failed to start webcam recording:", err);

      // Set specific error messages based on error type
      let errorMessage = "Failed to start webcam recording.";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMessage =
          "Camera permission denied. Please allow camera access in your system settings.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMessage =
          "Camera not found. Please check your camera connection and try again.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errorMessage =
          "Camera is in use by another application. Please close other apps using the camera and try again.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage =
          "Camera does not support the requested settings. Try a different resolution or camera.";
      } else if (err.name === "AbortError") {
        errorMessage = "Camera access was interrupted. Please try again.";
      } else if (err.message) {
        errorMessage = `Failed to start recording: ${err.message}`;
      }

      setError(errorMessage);
      setIsRecording(false);

      // Clean up streams if they were created
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  /**
   * Pause recording
   */
  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      // Pause the timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      console.log("Webcam recording paused");
    }
  };

  /**
   * Resume recording
   */
  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume the timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("Webcam recording resumed");
    }
  };

  /**
   * Stop recording and return the recorded blob
   */
  const stopRecording = () => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error("No active recording"));
        return;
      }

      try {
        // Clear the timer immediately
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        // Stop the MediaRecorder
        mediaRecorderRef.current.onstop = () => {
          // Combine all chunks into a single blob
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorderRef.current.mimeType || "video/webm",
          });

          console.log("Webcam recording stopped, blob size:", blob.size);

          // Clean up
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          mediaRecorderRef.current = null;
          chunksRef.current = [];
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
          setError(null);
          setMicPermissionDenied(false);

          resolve(blob);
        };

        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping webcam recording:", err);
        setError(err.message || "Failed to stop recording");
        reject(err);
      }
    });
  };

  /**
   * Format recording time as MM:SS
   */
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /**
   * Toggle microphone on/off
   */
  const toggleMicrophone = () => {
    setIsMicEnabled((prev) => !prev);
  };

  /**
   * Cleanup on unmount
   */
  const cleanup = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current) {
      stopRecording().catch(console.error);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  return {
    isRecording,
    isPaused,
    recordingTime,
    formattedTime: formatRecordingTime(recordingTime),
    error,
    isMicEnabled,
    micPermissionDenied,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    toggleMicrophone,
    cleanup,
  };
}
