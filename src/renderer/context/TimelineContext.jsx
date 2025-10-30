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
    { id: "overlay2", name: "Overlay 2", clips: [] },
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

  const splitClipAtPlayhead = (clipId, trackId, splitTime) => {
    setTracks((prevTracks) =>
      prevTracks.map((track) => {
        if (track.id !== trackId) return track;

        const clipIndex = track.clips.findIndex((c) => c.id === clipId);
        if (clipIndex === -1) return track;

        const originalClip = track.clips[clipIndex];
        
        // Calculate split position relative to the clip's trim bounds
        const trimStart = originalClip.trimStart || 0;
        const trimEnd = originalClip.trimEnd || originalClip.duration;
        const clipStartTime = originalClip.position;
        const clipEndTime = originalClip.position + (trimEnd - trimStart);
        
        // Verify split is within clip bounds
        if (splitTime <= clipStartTime || splitTime >= clipEndTime) {
          console.warn("Split time is outside clip bounds");
          return track;
        }

        // Calculate the split offset relative to the original video
        const splitOffset = trimStart + (splitTime - clipStartTime);

        // Create first clip (before split)
        const clip1 = {
          ...originalClip,
          id: uuidv4(),
          trimEnd: splitOffset,
        };

        // Create second clip (after split)
        const clip2 = {
          ...originalClip,
          id: uuidv4(),
          position: splitTime,
          trimStart: splitOffset,
        };

        // Replace original clip with two new clips
        const newClips = [...track.clips];
        newClips.splice(clipIndex, 1, clip1, clip2);

        return { ...track, clips: newClips };
      })
    );
  };

  const moveClipToTrack = (clipId, fromTrackId, toTrackId, newPosition) => {
    setTracks((prevTracks) => {
      // Find the clip in the source track
      const sourceTrack = prevTracks.find((t) => t.id === fromTrackId);
      if (!sourceTrack) return prevTracks;

      const clip = sourceTrack.clips.find((c) => c.id === clipId);
      if (!clip) return prevTracks;

      // Remove from source track and add to destination track with new position
      return prevTracks.map((track) => {
        if (track.id === fromTrackId) {
          // Remove clip from source track
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== clipId),
          };
        } else if (track.id === toTrackId) {
          // Add clip to destination track with updated position
          return {
            ...track,
            clips: [
              ...track.clips,
              {
                ...clip,
                track: toTrackId,
                position: newPosition,
              },
            ],
          };
        }
        return track;
      });
    });
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
    splitClipAtPlayhead,
    moveClipToTrack,
  };

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
};

