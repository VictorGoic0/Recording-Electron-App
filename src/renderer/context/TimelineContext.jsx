import React, { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const TimelineContext = createContext();

export const useTimeline = () => {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error("useTimeline must be used within a TimelineProvider");
  }
  return context;
};

export const TimelineProvider = ({ children }) => {
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedTimelineClipId, setSelectedTimelineClipId] = useState(null);
  
  // Track structure: { id, name, clips: [] }
  const [tracks, setTracks] = useState([
    { id: "main", name: "Main", clips: [] },
    { id: "overlay", name: "Overlay", clips: [] },
  ]);

  // Clip structure: { id, fileId, startTime, endTime, position, track }
  
  const addClipToTimeline = (clip, trackId, position) => {
    if (!clip || !trackId) return;

    const newClip = {
      id: uuidv4(),
      fileId: clip.id,
      filePath: clip.filePath,
      filename: clip.filename,
      duration: clip.duration,
      startTime: 0, // Start of clip in the source video
      endTime: clip.duration, // End of clip in the source video
      position: position || 0, // Position on timeline
      track: trackId,
      trimStart: 0, // Trim start offset in seconds
      trimEnd: clip.duration, // Trim end offset in seconds
    };

    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      )
    );

    return newClip;
  };

  const removeClipFromTimeline = (clipId, trackId) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: track.clips.filter((clip) => clip.id !== clipId) }
          : track
      )
    );
  };

  const updateClipPosition = (clipId, trackId, newPosition, newStartTime = null, newEndTime = null) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      position: newPosition !== undefined ? newPosition : clip.position,
                      startTime: newStartTime !== null ? newStartTime : clip.startTime,
                      endTime: newEndTime !== null ? newEndTime : clip.endTime,
                    }
                  : clip
              ),
            }
          : track
      )
    );
  };

  const updateClipTrim = (clipId, trackId, newTrimStart = null, newTrimEnd = null) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      trimStart: newTrimStart !== null ? Math.max(0, Math.min(newTrimStart, clip.trimEnd)) : clip.trimStart,
                      trimEnd: newTrimEnd !== null ? Math.min(clip.duration, Math.max(clip.trimStart, newTrimEnd)) : clip.trimEnd,
                    }
                  : clip
              ),
            }
          : track
      )
    );
  };

  const updatePlayhead = (newPlayhead) => {
    setPlayhead(newPlayhead);
  };

  const selectTimelineClip = (clipId) => {
    setSelectedTimelineClipId(clipId);
  };

  const getSelectedTimelineClip = () => {
    if (!selectedTimelineClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedTimelineClipId);
      if (clip) return clip;
    }
    return null;
  };

  const value = {
    // State
    playhead,
    duration,
    zoom,
    tracks,
    selectedTimelineClipId,
    selectedTimelineClip: getSelectedTimelineClip(),
    
    // Actions
    setPlayhead: updatePlayhead,
    setDuration,
    setZoom,
    addClipToTimeline,
    removeClipFromTimeline,
    updateClipPosition,
    updateClipTrim,
    selectTimelineClip,
  };

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
};

