import { create } from "zustand";
import { usePlaybackStore } from "./playbackStore";

export const useMediaStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  clips: [],
  selectedMediaLibraryClipId: null,

  // ── Actions ────────────────────────────────────────────────────────────────
  addMedia: (clip) => {
    set((state) => {
      const exists = state.clips.some((c) => c.id === clip.id);
      if (exists) {
        console.warn(`[mediaStore] Clip with ID ${clip.id} already exists`);
        return state;
      }
      console.log(`[mediaStore] Adding clip: ${clip.filename}`);
      return { clips: [...state.clips, clip] };
    });
  },

  addMultipleMedia: (newClips) => {
    set((state) => {
      const existingIds = new Set(state.clips.map((c) => c.id));
      const unique = newClips.filter((c) => !existingIds.has(c.id));
      if (unique.length < newClips.length) {
        console.warn(`[mediaStore] Skipped ${newClips.length - unique.length} duplicate clip(s)`);
      }
      console.log(`[mediaStore] Adding ${unique.length} clip(s)`);
      return { clips: [...state.clips, ...unique] };
    });
  },

  removeMedia: (clipId) => {
    set((state) => {
      const clip = state.clips.find((c) => c.id === clipId);
      if (clip) console.log(`[mediaStore] Removing clip: ${clip.filename}`);
      return {
        clips: state.clips.filter((c) => c.id !== clipId),
        selectedMediaLibraryClipId: state.selectedMediaLibraryClipId === clipId ? null : state.selectedMediaLibraryClipId,
      };
    });
  },

  updateMedia: (clipId, updates) => {
    set((state) => ({
      clips: state.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
    }));
    console.log(`[mediaStore] Updated clip: ${clipId}`);
  },

  clearAllMedia: () => {
    console.log(`[mediaStore] Clearing all ${get().clips.length} clip(s)`);
    set({ clips: [], selectedMediaLibraryClipId: null });
  },

  selectMediaLibraryClip: (clipId) => {
    // Clear timeline selection when actively selecting a library clip (not when clearing)
    if (clipId !== null) usePlaybackStore.getState().selectTimelineClip(null);
    set({ selectedMediaLibraryClipId: clipId });
  },
}));
