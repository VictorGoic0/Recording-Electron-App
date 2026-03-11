# ClipForge — Zustand State Refactor: Technical Design Document

> **Decisions locked:** Option A (two stores). Playhead stored as absolute seconds. See Section 4.

---

## 1. Problem Statement

### 1.1 Observed Bugs

**Bug 1 — Video player controls unresponsive on first preview load**
When a clip is first selected and previewed, play/pause works but keyboard seek (Arrow Left/Right) and mouse scrubbing on the progress bar have no effect — the video snaps back to where it was. This is a stale closure / race condition: `VideoPlayer` mounts and attaches keyboard handlers before `duration` is populated from `onLoadedMetadata`. The handlers close over `duration = 0`, so all seek math produces `0` and any seek attempt is a no-op that appears to reset position.

**Bug 2 — Playhead (red line) and video are out of sync**
`playhead` in `TimelineContext` is a normalized value `[0, 1]`. `VideoPlayer` receives it as `timelinePlayhead` and converts it to seconds using its own local `duration` state. The timeline computes its visual red-line position from the same `playhead`, but using `TimelineContext`'s own `duration` state — a *separate* piece of state. When these two `duration` values diverge (e.g., the video's `onLoadedMetadata` fires but `TimelineContext.duration` hasn't been updated yet, or vice versa), the red line and video cursor point to different absolute times even though they share the same normalized `playhead` number.

**Bug 3 — Split clips at wrong position**
`splitClipAtPlayhead` in `TimelineContext` uses `playhead` from its own context. The video's actual current time is only communicated back via `onCurrentTimeChange → setPlayhead` — a callback chain that traverses `App.jsx`. Any render cycle where the video updates its time but the context hasn't received the callback yet means the split fires at the last-committed `playhead`, not the true current frame. This is a classic callback-lag race condition.

### 1.2 Root Cause

All three bugs share one root cause: **the same logical piece of state (current playback position, duration, selected clip) is represented in multiple disconnected places simultaneously**.

| State | Currently lives in |
|---|---|
| `playhead` (normalized 0–1) | `TimelineContext` |
| `currentTime` (seconds) | `VideoPlayer` local state |
| `duration` (seconds) | `VideoPlayer` local state **AND** `TimelineContext` |
| `selectedClip` | `MediaContext` (library selection) **AND** `App.jsx` (passed as prop) |
| `selectedTimelineClip` | `TimelineContext` (computed on every render) |
| `tracks` | `TimelineContext` |
| `clips` (library) | `MediaContext` |

These are synchronized via prop drilling and React context, both of which introduce at least one render cycle of lag between a state write and the consumers seeing the new value. React's batched re-renders make the ordering non-deterministic under concurrent user input.

Zustand solves this because all subscribers read from the same synchronous in-memory store. A write is immediately visible to all selectors in the same tick — no prop propagation, no context re-render chain.

---

## 2. Chosen Architecture: Option A — Two Stores

**Decision:** Two stores — `useMediaStore` and `usePlaybackStore`.

Options B (three stores) and C (monolithic) were considered and rejected. See Section 3 for the full comparison.

### Store Shape

```
useMediaStore              usePlaybackStore
─────────────              ────────────────
clips                      playhead          ← absolute seconds (see §4)
selectedClipId             duration          ← single source of truth
                           currentTime       ← moved from VideoPlayer local state
                           isPlaying         ← moved from VideoPlayer local state
                           isSeeking         ← moved from VideoPlayer local state
                           tracks
                           zoom
                           selectedTimelineClipId
```

### Rationale

Media library state (`useMediaStore`) is about **what files exist in the project**. Playback state (`usePlaybackStore`) is about **the current editing session** — timeline structure, video position, and playback controls are all tightly coupled and must never be split. Everything that caused the three bugs above lives in `usePlaybackStore`, making it a single surface to debug with Zustand DevTools.

UI-only state (toasts, modal visibility, processing flag) stays in `App.jsx` local state. It doesn't cross component boundaries in a way that causes bugs, and pulling it into a store adds noise without fixing anything.

---

## 3. Rejected Options

### Option B — Three Stores: `mediaStore` + `timelineStore` + `playerStore`

Attempts to separate timeline structure from live player state. Rejected because `playhead`, `duration`, and `currentTime` must stay in sync — splitting them across two stores recreates the exact race condition we're solving. Would require a Zustand middleware subscription or `useEffect` bridge, which is the same problem in different clothes.

### Option C — One Monolithic Store with Slices

Single store using Zustand's slice pattern. Rejected because UI state (`toasts`, `isProcessing`) doesn't benefit from global store and pulling it in creates long-term "throw everything in" creep. Two stores gives atomic cross-store writes for the one case that needs it (select clip + reset playhead) without the overhead.

---

## 4. Key Architectural Decision: Playhead in Absolute Seconds

**Decision:** `playhead` will be stored and communicated as **absolute seconds**, not as a normalized `[0, 1]` fraction.

### Why the normalization was the hidden bug

The current system stores `playhead` as a fraction of total duration. To render the red line or seek the video, each consumer multiplies `playhead × duration`. But `duration` is stored separately in both `VideoPlayer` local state and `TimelineContext` — two values that are written asynchronously and can temporarily disagree. The same `playhead` fraction produces different absolute positions depending on which `duration` a component happens to have at that instant.

### Why absolute seconds fixes it

Absolute seconds are self-contained. There is no multiplication. The red line, the video element, and the split function all read the same number and act on it directly. A `playhead` of `14.3` means 14.3 seconds into the clip — unambiguously, regardless of which component is reading it or when.

`duration` is still stored in `usePlaybackStore` (needed for UI display and bounds clamping), but it is no longer used as a conversion factor shared across components.

### Migration impact

| Before | After |
|---|---|
| `playhead` = normalized `0.0–1.0` fraction | `playhead` = absolute seconds (`number`) |
| Timeline renders red line at `playhead * totalWidth` | Timeline renders red line at `(playhead / duration) * totalWidth` |
| `VideoPlayer` seeks to `timelinePlayhead * videoElement.duration` | `VideoPlayer` seeks directly to `playhead` |
| `onCurrentTimeChange` emits normalized fraction | `setPlayhead(seconds)` emits absolute seconds |
| `splitClipAtPlayhead` receives normalized position | `splitClipAtPlayhead` receives absolute seconds directly |

---

## 5. Migration Scope

### Phase 1 — PR #1: Install Zustand, migrate both Contexts

1. Install `zustand`
2. Create `src/renderer/store/mediaStore.js` — direct port of `MediaContext`
3. Create `src/renderer/store/playbackStore.js` — port of `TimelineContext`, with `playhead` as absolute seconds
4. Replace all `useMedia()` consumers with `useMediaStore()` selectors
5. Replace all `useTimeline()` consumers with `usePlaybackStore()` selectors
6. Remove `<MediaProvider>` and `<TimelineProvider>` from `index.jsx`
7. Delete `MediaContext.jsx` and `TimelineContext.jsx`

At the end of Phase 1, `VideoPlayer` still manages `currentTime`, `duration`, `isPlaying`, and `isSeeking` as local state, but all context-derived state and the prop drilling chain from `App.jsx` is gone.

### Phase 2 — PR #2: Move VideoPlayer shared state into `usePlaybackStore`

1. Move `currentTime`, `duration`, `isPlaying`, `isSeeking` from `VideoPlayer` local state into `usePlaybackStore`
2. `VideoPlayer` writes to store on `onTimeUpdate` (→ `setCurrentTime`, `setPlayhead`) and `onLoadedMetadata` (→ `setDuration`)
3. Remove `onCurrentTimeChange` / `timelinePlayhead` props from `VideoPlayer` — no longer needed
4. Remove the corresponding prop bridges in `App.jsx`
5. Validate all three bug fixes (see §6)

Pure UI-local state in `VideoPlayer` that stays local: `volume`, `isMuted`, `error`.

### Out of Scope

- No changes to IPC or main process
- No changes to FFmpeg services
- No changes to `useScreenRecording` or `useWebcamRecording` — they use local state only and don't interact with playback
- No `immer` middleware unless complexity demands it later

---

## 6. Bug Fix Validation Checklist

After Phase 2 is complete:

- [x] **Bug 1:** Keyboard seek works on first clip load. Stale closure eliminated — keyboard handlers read directly from `videoRef.current`, never a closed-over local variable.
- [x] **Bug 2:** Red line and video cursor are in sync. Single `playhead` in absolute seconds, single `duration` — no multiplication divergence possible.
- [x] **Bug 3:** Split fires at the correct position. `splitClipAtPlayhead` reads `playhead` directly from store — no callback lag, no render-cycle delay.

---

## 7. Files Affected

| File | Phase | Action |
|---|---|---|
| `src/renderer/store/mediaStore.js` | 1 | **Create** |
| `src/renderer/store/playbackStore.js` | 1 | **Create** |
| `src/renderer/context/MediaContext.jsx` | 1 | **Delete** |
| `src/renderer/context/TimelineContext.jsx` | 1 | **Delete** |
| `src/renderer/index.jsx` | 1 | Remove context providers |
| `src/renderer/App.jsx` | 1 + 2 | Remove context imports; remove prop bridges |
| `src/renderer/components/MediaLibrary/MediaLibrary.jsx` | 1 | Replace `useMedia()` with store |
| `src/renderer/components/Timeline/Timeline.jsx` | 1 + 2 | Replace `useTimeline()` with store; adapt to absolute-seconds playhead |
| `src/renderer/components/VideoPlayer/VideoPlayer.jsx` | 2 | Move shared local state to store; remove prop chain |
