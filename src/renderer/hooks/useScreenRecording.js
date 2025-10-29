import { useState, useRef, useCallback } from "react";

/**
 * Custom hook for screen recording using MediaRecorder API
 */
export function useScreenRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

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
   * Start recording with the selected screen source
   * @param {string} sourceId - Desktop source ID from desktopCapturer
   * @param {object} options - Recording options (bitrate, frameRate, etc.)
   */
  const startRecording = useCallback(async (sourceId, options = {}) => {
    try {
      setError(null);

      // Request screen stream using getUserMedia with desktopCapturer source
      // In Electron, we use chromeMediaSource constraints for desktop capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, // Audio will be handled separately in subtask 6
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        },
      });

      streamRef.current = stream;

      // Get supported codec
      const codec = getSupportedCodec();

      // Configure MediaRecorder options
      const recorderOptions = {
        mimeType: codec,
        videoBitsPerSecond: options.bitrate || 2500000, // 2.5 Mbps default
      };

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
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
          "Recording stopped, total chunks:",
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

      console.log("Recording started with source:", sourceId);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err.message || "Failed to start recording");
      setIsRecording(false);

      // Clean up stream if it was created
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, []);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log("Recording paused");
    }
  }, [isRecording, isPaused]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      console.log("Recording resumed");
    }
  }, [isRecording, isPaused]);

  /**
   * Stop recording and return the recorded blob
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error("No active recording"));
        return;
      }

      try {
        // Stop the MediaRecorder
        mediaRecorderRef.current.onstop = () => {
          // Combine all chunks into a single blob
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorderRef.current.mimeType || "video/webm",
          });

          console.log("Recording stopped, blob size:", blob.size);

          // Clean up
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }

          mediaRecorderRef.current = null;
          chunksRef.current = [];
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
          setError(null);

          resolve(blob);
        };

        mediaRecorderRef.current.stop();

        // Clear the timer
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      } catch (err) {
        console.error("Error stopping recording:", err);
        setError(err.message || "Failed to stop recording");
        reject(err);
      }
    });
  }, []);

  /**
   * Format recording time as MM:SS
   */
  const formatRecordingTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  /**
   * Cleanup on unmount
   */
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      stopRecording().catch(console.error);
    }
  }, [isRecording, stopRecording]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    formattedTime: formatRecordingTime(recordingTime),
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cleanup,
  };
}
