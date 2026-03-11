# ClipForge — Zustand Refactor: Task Breakdown

> Reference: `ZUSTAND_REFACTOR.md` for full architecture decisions and bug analysis.
> Each phase ships as its own PR. Do not merge Phase 2 before Phase 1 is merged.

---

## Phase 1 — PR #1: Install Zustand, migrate Contexts to stores

**Goal:** Eliminate `MediaContext` and `TimelineContext`. Replace with `useMediaStore` and `usePlaybackStore`. `VideoPlayer` still manages its own local playback state at the end of this phase — that is intentional and tackled in Phase 2.

**Definition of done:** App boots, imports work, clips can be added to the timeline, timeline clips can be selected, playhead can be dragged — all without any React context. `MediaContext.jsx` and `TimelineContext.jsx` are deleted.

---

### Task 1.1 — Install Zustand ✅

- [x] Run `npm install zustand`
- [x] Verify it appears in `package.json` dependencies
- [x] Confirm no peer dependency conflicts with current Electron/Vite/React versions

---

### Task 1.2 — Create `useMediaStore` ✅

**File:** `src/renderer/store/mediaStore.js` (new file)

Port all state and actions from `MediaContext.jsx` into a Zustand store. No behavioral changes — this is a direct lift-and-shift.

State to include:
- [x] `clips` — array of clip objects
- [x] `selectedClipId` — string | null

Actions to include:
- [x] `addMedia(clip)` — add single clip, skip if ID already exists
- [x] `addMultipleMedia(clips)` — batch add, skip duplicates
- [x] `removeMedia(clipId)` — remove clip, clear `selectedClipId` if it matches
- [x] `updateMedia(clipId, updates)` — partial update a clip
- [x] `clearAllMedia()` — reset clips and selectedClipId
- [x] `selectClip(clipId)` — set selectedClipId

Computed values (derive at call site, not stored):
- [x] `selectedClip` — derive with `clips.find(c => c.id === selectedClipId)`
- [x] `clipsCount` — `clips.length`
- [x] `totalDuration` — `clips.reduce(...)`

---

### Task 1.3 — Create `usePlaybackStore` ✅

**File:** `src/renderer/store/playbackStore.js` (new file)

Port all state and actions from `TimelineContext.jsx`. **Critical change: `playhead` is now absolute seconds, not a normalized fraction.** See `ZUSTAND_REFACTOR.md §4` for full rationale.

State to include:
- [x] `playhead` — number (absolute seconds, default `0`)
- [x] `duration` — number (total timeline duration in seconds, default `0`)
- [x] `zoom` — number (default `1`)
- [x] `selectedTimelineClipId` — string | null
- [x] `tracks` — array of track objects

Actions to include (direct ports from `TimelineContext`):
- [x] `setPlayhead(seconds)` — set playhead, clamp to `[0, duration]`
- [x] `setDuration(seconds)`
- [x] `setZoom(zoom)`
- [x] `selectTimelineClip(clipId)`
- [x] `addClipToTimeline(clip, trackId, position)`
- [x] `removeClipFromTimeline(clipId, trackId)`
- [x] `updateClipPosition(clipId, trackId, newPosition, newStartTime, newEndTime)`
- [x] `updateClipTrim(clipId, trackId, newTrimStart, newTrimEnd)`
- [x] `splitClipAtPlayhead(clipId, trackId, splitTime)` — `splitTime` is absolute seconds
- [x] `moveClipToTrack(clipId, fromTrackId, toTrackId, newPosition)`

Computed values (derive at call site):
- [x] `selectedTimelineClip` — derive with `tracks.flatMap(t => t.clips).find(c => c.id === selectedTimelineClipId)`

---

### Task 1.4 — Migrate `App.jsx` ✅

**File:** `src/renderer/App.jsx`

- [x] Remove `import { useMedia } from "./context/MediaContext"`
- [x] Remove `import { useTimeline } from "./context/TimelineContext"`
- [x] Replace with `import { useMediaStore } from "./store/mediaStore"` and `import { usePlaybackStore } from "./store/playbackStore"`
- [x] Update all destructured values to use store selectors
- [x] Remove `playhead` and `setPlayhead` from props passed to `<VideoPlayer>` — these will be read directly from the store in Phase 2. For now, keep `timelinePlayhead` and `onCurrentTimeChange` props on `<VideoPlayer>` wired to the store's `playhead` and `setPlayhead` to avoid breaking VideoPlayer before Phase 2
- [x] Remove `selectedTimelineClip` and `tracks` props from `<VideoPlayer>` — VideoPlayer should read these from the store directly (update VideoPlayer in the same commit)
- [x] Update `<Timeline>` to not receive `playhead` and `onPlayheadChange` as props — it will read from store directly (update Timeline in the same commit)
- [x] Keep `<MediaLibrary>` prop interface unchanged for now — it does not use context directly and its props come from App

---

### Task 1.5 — Migrate `Timeline.jsx` ✅

**File:** `src/renderer/components/Timeline/Timeline.jsx`

- [x] Remove `import { useTimeline } from "../../context/TimelineContext"`
- [x] Add `import { usePlaybackStore } from "../../store/playbackStore"`
- [x] Replace all `useTimeline()` destructuring with `usePlaybackStore()` selectors
- [x] Remove `playhead` and `onPlayheadChange` from function signature — read `playhead` and `setPlayhead` from store
- [x] **Adapt playhead rendering to absolute seconds:**
  - All occurrences of `playhead * 100` changed to `(playhead / maxTimelineDuration) * 100`
  - All occurrences of `playhead * maxTimelineDuration` replaced with `playhead` directly
  - `onPlayheadChange(time / maxTimelineDuration)` changed to `setPlayhead(time)`
- [x] `splitClipAtPlayhead` call: `splitTime` is now `playhead` directly — conversion removed
- [x] `TimelineClip` sub-component: `playhead` prop now receives absolute seconds, internal math adjusted

---

### Task 1.6 — Migrate `VideoPlayer.jsx` (context props only) ✅

**File:** `src/renderer/components/VideoPlayer/VideoPlayer.jsx`

Phase 1 scope only — remove props that came from context via App. Local state (`currentTime`, `duration`, `isPlaying`, `isSeeking`) stays local until Phase 2.

- [x] Add `import { usePlaybackStore } from "../../store/playbackStore"` and `import { useMediaStore } from "../../store/mediaStore"`
- [x] Remove `selectedTimelineClip`, `tracks`, `playhead` from function props — read from store
- [x] Keep `timelinePlayhead` and `onCurrentTimeChange` temporarily as they bridge to the store until Phase 2 removes them entirely
- [x] Remove `selectedMediaClip` prop — read `selectedClip` from `useMediaStore` directly
- [x] Updated `timelinePlayhead` sync effect: now seeks to `timelinePlayhead` directly (absolute seconds)
- [x] Updated `handleTimeUpdate`: `onCurrentTimeChange` now emits absolute seconds, not normalized fraction
- [x] Removed dead empty `useEffect` for playhead sync

---

### Task 1.7 — Update `index.jsx` ✅

**File:** `src/renderer/index.jsx`

- [x] Remove `import { MediaProvider } from "./context/MediaContext"`
- [x] Remove `import { TimelineProvider } from "./context/TimelineContext"`
- [x] Remove `<MediaProvider>` and `<TimelineProvider>` wrapper elements
- [x] Zustand stores initialize themselves on first import — no Provider needed

---

### Task 1.8 — Delete context files ✅

- [x] Delete `src/renderer/context/MediaContext.jsx`
- [x] Delete `src/renderer/context/TimelineContext.jsx`
- [x] Confirm no remaining imports of either file anywhere in the codebase

---

### Task 1.9 — Smoke test Phase 1 ✅

- [x] App boots without errors
- [x] Import video files → appear in media library
- [x] Select clip in library → video preview loads
- [x] Drag clip to timeline → appears on correct track
- [x] Drag playhead on timeline → red line moves
- [x] Select timeline clip → clip is highlighted
- [x] Remove clip from library → clip disappears
- [x] No console errors referencing `MediaContext` or `TimelineContext`

---

## Phase 2 — PR #2: Move VideoPlayer shared state into `usePlaybackStore`

**Goal:** Eliminate the remaining prop chain (`timelinePlayhead`, `onCurrentTimeChange`) between `App.jsx` and `VideoPlayer`. Move `currentTime`, `duration`, `isPlaying`, and `isSeeking` from `VideoPlayer` local state into `usePlaybackStore`. This is the phase that directly fixes all three reported bugs.

**Prerequisite:** Phase 1 PR is merged to `master`.

**Definition of done:** All three bugs in `ZUSTAND_REFACTOR.md §1.1` are confirmed fixed. `VideoPlayer` receives zero playback-related props from `App.jsx`.

---

### Task 2.1 — Extend `usePlaybackStore` with player state ✅

**File:** `src/renderer/store/playbackStore.js`

Add to the store:
- [x] `currentTime` — number (seconds, default `0`)
- [x] `isPlaying` — boolean (default `false`)
- [x] `isSeeking` — boolean (default `false`)

Add actions:
- [x] `setCurrentTime(seconds)` — atomic write: `{ currentTime: seconds, playhead: seconds }`
- [x] `setIsPlaying(bool)`
- [x] `setIsSeeking(bool)`
- [x] Updated `setDuration(seconds)` — cleanly clamps both `playhead` and `currentTime` (no conditional spread needed since `currentTime` always exists)

**Key design note:** `setCurrentTime` writes both `currentTime` and `playhead` in a single store update. This is the atomic write that eliminates the race condition — there is no longer a separate "notify parent of time change" step.

---

### Task 2.2 — Refactor `VideoPlayer.jsx` ✅

**File:** `src/renderer/components/VideoPlayer/VideoPlayer.jsx`

- [x] Removed local state for `currentTime`, `duration`, `isPlaying`, `isSeeking`
- [x] Replaced with `usePlaybackStore` selectors for those four values + their setters
- [x] Removed `timelinePlayhead` and `onCurrentTimeChange` props entirely — component takes only `onShowToast`
- [x] Replaced `timelinePlayhead` sync effect with store `playhead` watcher; `seekingFromVideoRef` ref flag prevents feedback loop
- [x] `onLoadedMetadata`: calls `setDuration(videoDuration)` on store
- [x] `onTimeUpdate`: calls `setCurrentTime(newTime)` atomically (updates both `currentTime` and `playhead`); sets `seekingFromVideoRef` guard before writing
- [x] `handleProgressBarMouseDown` / `handleMouseMove`: extracted into `seekToPosition()` helper; calls `setCurrentTime` and `setIsSeeking` on store
- [x] `togglePlayPause`: calls `setIsPlaying` on store
- [x] `handleEnded`: calls `setIsPlaying(false)` on store
- [x] Keyboard handlers: ArrowLeft/Right read directly from `videoRef.current` — never stale, no closed-over local variables
- [x] `volume`, `isMuted`, `error` remain local state

---

### Task 2.3 — Clean up `App.jsx` ✅

**File:** `src/renderer/App.jsx`

- [x] Removed `timelinePlayhead` and `onCurrentTimeChange` props from `<VideoPlayer>`
- [x] Removed `usePlaybackStore` import and all playback-related selectors (`playhead`, `setPlayhead`, `tracks`, `selectedTimelineClip`) — App no longer needs them
- [x] `<VideoPlayer onShowToast={showToast} />` — only one prop remains

---

### Task 2.4 — Validate bug fixes ✅

**Bug 1 — Keyboard seek on first load**
- [x] Import a fresh video, click preview
- [x] Without clicking anywhere else, press Arrow Right
- [x] Video advances 10 seconds — confirmed fixed

**Bug 2 — Red line sync**
- [x] Add clip to timeline, play video
- [x] Red line tracks video position in real time
- [x] Drag red line — video seeks to exact position — confirmed fixed

**Bug 3 — Split at correct position**
- [x] Add clip to timeline, play to ~halfway
- [x] Pause and press Ctrl+K
- [x] Clip splits at exact paused position — confirmed fixed

---

### Task 2.5 — Final cleanup ✅

- [x] No debug `console.log` statements added during refactor — store logs are intentional operational logs carried over from original context
- [x] `src/renderer/context/` directory is empty
- [x] `ZUSTAND_REFACTOR.md` §6 bug fix checklist marked complete
- [x] `tasks-zustand.md` all tasks complete
