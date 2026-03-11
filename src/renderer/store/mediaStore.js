import { create } from "zustand";

export const useMediaStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  clips: [],
  selectedClipId: null,

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
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
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
    set({ clips: [], selectedClipId: null });
  },

  selectClip: (clipId) => {
    const clip = get().clips.find((c) => c.id === clipId);
    if (clipId && clip) {
      console.log(`[mediaStore] Selected clip: ${clip.filename}`);
    } else if (!clipId) {
      console.log(`[mediaStore] Deselected clip`);
    }
    set({ selectedClipId: clipId });
  },
}));
