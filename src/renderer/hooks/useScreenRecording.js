import { useState, useRef } from "react";

/**
 * Custom hook for screen recording using MediaRecorder API
 */
export function useScreenRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  // When true, streamRef is an externally-owned preview stream — don't stop its tracks on cleanup
  const streamIsExternalRef = useRef(false);

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
   * Shared recording logic — starts MediaRecorder from an already-acquired stream.
   * Called by both startRecording (acquires fresh stream) and startRecordingFromStream
   * (reuses existing preview stream).
   */
  const startRecordingWithStream = async (videoStream, options = {}, isExternal = false) => {
    streamIsExternalRef.current = isExternal;
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    streamRef.current = videoStream;
    let combinedStream = videoStream;

    if (options.includeMicrophone !== false && isMicEnabled) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        audioStreamRef.current = audioStream;
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);
      } catch (audioError) {
        console.warn("Microphone access denied or unavailable:", audioError);
        setMicPermissionDenied(true);
      }
    }

    const codec = getSupportedCodec();
    const recorderOptions = {
      mimeType: codec,
      videoBitsPerSecond: options.bitrate || 2500000,
    };

    const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };
    mediaRecorder.onerror = (event) => {
      console.error("MediaRecorder error:", event);
      setError("Recording error occurred");
      stopRecording();
    };

    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  /**
   * Start recording by acquiring a new stream from the given source ID.
   * @param {string} sourceId - Desktop source ID from desktopCapturer
   * @param {object} options - Recording options
   */
  const startRecording = async (sourceId, options = {}) => {
    try {
      setError(null);
      setMicPermissionDenied(false);
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        },
      });
      await startRecordingWithStream(videoStream, options);
    } catch (err) {
      console.error("Failed to start screen recording:", err);
      setError(err.message || "Failed to start recording");
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      throw err;
    }
  };

  /**
   * Start recording from an already-acquired preview stream.
   * The stream is NOT stopped when recording ends — the caller owns the stream lifecycle.
   * @param {MediaStream} existingStream - Live preview stream to record from
   * @param {object} options - Recording options
   */
  const startRecordingFromStream = async (existingStream, options = {}) => {
    try {
      setError(null);
      setMicPermissionDenied(false);
      await startRecordingWithStream(existingStream, options, true);
    } catch (err) {
      console.error("Failed to start screen recording from stream:", err);
      setError(err.message || "Failed to start recording");
      setIsRecording(false);
      throw err;
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

      console.log("Recording paused");
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

      console.log("Recording resumed");
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

          console.log("Recording stopped, blob size:", blob.size);

          // Only stop stream tracks if we acquired the stream internally
          if (streamRef.current && !streamIsExternalRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          streamRef.current = null;
          streamIsExternalRef.current = false;
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
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
        console.error("Error stopping recording:", err);
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
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
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
    startRecordingFromStream,
    pauseRecording,
    resumeRecording,
    stopRecording,
    toggleMicrophone,
    cleanup,
  };
}
