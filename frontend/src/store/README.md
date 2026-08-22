# store

**Responsibility:** shared app state that doesn't fit local component state or `contexts/`.

- Belongs here: a Redux/Zustand/Jotai store, its slices, and selectors, once state
  needs to be read/written from many unrelated features.
- Doesn't belong here: state used by a single page or component tree — keep that
  local, or use `contexts/` if it's just prop-drilling relief.
