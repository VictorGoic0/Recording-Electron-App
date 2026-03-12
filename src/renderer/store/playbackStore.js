import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export const usePlaybackStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  // playhead is stored as absolute seconds — NOT a normalized [0,1] fraction.
  // All consumers read/write seconds directly. See ZUSTAND_REFACTOR.md §4.
  playhead: 0,
  duration: 0,
  zoom: 1,
  selectedTimelineClipId: null,

  // ── Player State ───────────────────────────────────────────────────────────
  isPlaying: false,
  tracks: [
    { id: "main", name: "Main", clips: [] },
    { id: "overlay", name: "Overlay", clips: [] },
    { id: "overlay2", name: "Overlay 2", clips: [] },
  ],

  // ── Playhead / Duration ────────────────────────────────────────────────────
  setPlayhead: (seconds) => {
    const { duration } = get();
    set({ playhead: Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds) });
  },

  setDuration: (seconds) => {
    const { playhead } = get();
    set({
      duration: seconds,
      playhead: seconds > 0 ? Math.min(playhead, seconds) : playhead,
    });
  },

  setZoom: (zoom) => set({ zoom }),

  // ── Player Actions ─────────────────────────────────────────────────────────

  setIsPlaying: (bool) => set({ isPlaying: bool }),

  // ── Timeline Clip Selection ────────────────────────────────────────────────
  selectTimelineClip: (clipId) => set({ selectedTimelineClipId: clipId }),

  // ── Track / Clip Operations ────────────────────────────────────────────────
  addClipToTimeline: (clip, trackId, position) => {
    if (!clip || !trackId) return;

    const newClip = {
      id: uuidv4(),
      fileId: clip.id,
      filePath: clip.filePath,
      filename: clip.filename,
      duration: clip.duration,
      startTime: 0,
      endTime: clip.duration,
      position: position || 0,
      track: trackId,
      trimStart: 0,
      trimEnd: clip.duration,
    };

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      ),
    }));

    return newClip;
  },

  removeClipFromTimeline: (clipId, trackId) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: track.clips.filter((c) => c.id !== clipId) }
          : track
      ),
    }));
  },

  updateClipPosition: (clipId, trackId, newPosition, newStartTime = null, newEndTime = null) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
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
      ),
    }));
  },

  updateClipTrim: (clipId, trackId, newTrimStart = null, newTrimEnd = null) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      trimStart:
                        newTrimStart !== null
                          ? Math.max(0, Math.min(newTrimStart, clip.trimEnd))
                          : clip.trimStart,
                      trimEnd:
                        newTrimEnd !== null
                          ? Math.min(clip.duration, Math.max(clip.trimStart, newTrimEnd))
                          : clip.trimEnd,
                    }
                  : clip
              ),
            }
          : track
      ),
    }));
  },

  // splitTime is absolute seconds — callers pass playhead directly, no conversion needed.
  splitClipAtPlayhead: (clipId, trackId, splitTime) => {
    set((state) => ({
      tracks: state.tracks.map((track) => {
        if (track.id !== trackId) return track;

        const clipIndex = track.clips.findIndex((c) => c.id === clipId);
        if (clipIndex === -1) return track;

        const original = track.clips[clipIndex];
        const trimStart = original.trimStart || 0;
        const trimEnd = original.trimEnd || original.duration;
        const clipStartTime = original.position;
        const clipEndTime = original.position + (trimEnd - trimStart);

        if (splitTime <= clipStartTime || splitTime >= clipEndTime) {
          console.warn("[playbackStore] Split time is outside clip bounds");
          return track;
        }

        const splitOffset = trimStart + (splitTime - clipStartTime);

        const clip1 = { ...original, id: uuidv4(), trimEnd: splitOffset };
        const clip2 = { ...original, id: uuidv4(), position: splitTime, trimStart: splitOffset };

        const newClips = [...track.clips];
        newClips.splice(clipIndex, 1, clip1, clip2);

        return { ...track, clips: newClips };
      }),
    }));
  },

  moveClipToTrack: (clipId, fromTrackId, toTrackId, newPosition) => {
    set((state) => {
      const sourceTrack = state.tracks.find((t) => t.id === fromTrackId);
      if (!sourceTrack) return state;

      const clip = sourceTrack.clips.find((c) => c.id === clipId);
      if (!clip) return state;

      return {
        tracks: state.tracks.map((track) => {
          if (track.id === fromTrackId) {
            return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
          }
          if (track.id === toTrackId) {
            return {
              ...track,
              clips: [...track.clips, { ...clip, track: toTrackId, position: newPosition }],
            };
          }
          return track;
        }),
      };
    });
  },
}));
