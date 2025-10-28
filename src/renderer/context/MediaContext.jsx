import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * MediaContext - Centralized state management for media clips
 * Provides clips state and actions to add/remove/update clips
 */

const MediaContext = createContext(null);

/**
 * Custom hook to use MediaContext
 * Throws error if used outside of MediaProvider
 */
export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error("useMedia must be used within a MediaProvider");
  }
  return context;
}

/**
 * MediaProvider Component
 * Wraps the app to provide media state to all components
 */
export function MediaProvider({ children }) {
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);

  /**
   * Add a new media clip to the library
   * @param {Object} clip - Clip object with id, filename, path, duration, etc.
   */
  const addMedia = useCallback((clip) => {
    setClips((prevClips) => {
      // Check if clip with same ID already exists
      const exists = prevClips.some((existingClip) => existingClip.id === clip.id);
      if (exists) {
        console.warn(`Clip with ID ${clip.id} already exists`);
        return prevClips;
      }
      
      console.log(`[MediaContext] Adding clip: ${clip.filename}`);
      return [...prevClips, clip];
    });
  }, []);

  /**
   * Add multiple media clips at once
   * @param {Array} newClips - Array of clip objects
   */
  const addMultipleMedia = useCallback((newClips) => {
    setClips((prevClips) => {
      const existingIds = new Set(prevClips.map((clip) => clip.id));
      const uniqueNewClips = newClips.filter((clip) => !existingIds.has(clip.id));
      
      if (uniqueNewClips.length < newClips.length) {
        console.warn(`Skipped ${newClips.length - uniqueNewClips.length} duplicate clips`);
      }
      
      console.log(`[MediaContext] Adding ${uniqueNewClips.length} clips`);
      return [...prevClips, ...uniqueNewClips];
    });
  }, []);

  /**
   * Remove a media clip from the library
   * @param {string} clipId - ID of the clip to remove
   */
  const removeMedia = useCallback((clipId) => {
    setClips((prevClips) => {
      const clip = prevClips.find((c) => c.id === clipId);
      if (clip) {
        console.log(`[MediaContext] Removing clip: ${clip.filename}`);
      }
      return prevClips.filter((clip) => clip.id !== clipId);
    });

    // If the removed clip was selected, clear selection
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  }, [selectedClipId]);

  /**
   * Update an existing media clip
   * @param {string} clipId - ID of the clip to update
   * @param {Object} updates - Partial clip object with fields to update
   */
  const updateMedia = useCallback((clipId, updates) => {
    setClips((prevClips) =>
      prevClips.map((clip) =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      )
    );
    console.log(`[MediaContext] Updated clip: ${clipId}`);
  }, []);

  /**
   * Clear all media clips
   */
  const clearAllMedia = useCallback(() => {
    console.log(`[MediaContext] Clearing all ${clips.length} clips`);
    setClips([]);
    setSelectedClipId(null);
  }, [clips.length]);

  /**
   * Get a clip by ID
   * @param {string} clipId - ID of the clip
   * @returns {Object|undefined} Clip object or undefined
   */
  const getClipById = useCallback(
    (clipId) => {
      return clips.find((clip) => clip.id === clipId);
    },
    [clips]
  );

  /**
   * Get the currently selected clip
   * @returns {Object|null} Selected clip object or null
   */
  const getSelectedClip = useCallback(() => {
    if (!selectedClipId) return null;
    return clips.find((clip) => clip.id === selectedClipId) || null;
  }, [clips, selectedClipId]);

  /**
   * Select a clip
   * @param {string|null} clipId - ID of the clip to select, or null to deselect
   */
  const selectClip = useCallback((clipId) => {
    setSelectedClipId(clipId);
    if (clipId) {
      const clip = clips.find((c) => c.id === clipId);
      if (clip) {
        console.log(`[MediaContext] Selected clip: ${clip.filename}`);
      }
    } else {
      console.log(`[MediaContext] Deselected clip`);
    }
  }, [clips]);

  // Context value with state and actions
  const value = {
    // State
    clips,
    selectedClipId,
    selectedClip: getSelectedClip(),
    
    // Actions
    addMedia,
    addMultipleMedia,
    removeMedia,
    updateMedia,
    clearAllMedia,
    getClipById,
    selectClip,
    
    // Computed values
    clipsCount: clips.length,
    totalDuration: clips.reduce((sum, clip) => sum + (clip.duration || 0), 0),
  };

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  );
}

