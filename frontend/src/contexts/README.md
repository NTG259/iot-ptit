# contexts

**Responsibility:** React context providers and their consumer hooks.

- Belongs here: `AuthContext` (+ `AuthProvider`, `useAuth`), `ThemeContext` — state
  that must be readable from many unrelated components without prop drilling.
- Doesn't belong here: state only used by one component tree — keep that local with
  `useState`/`useReducer`. State shared across the app but not via React context
  (e.g. a Redux/Zustand store) belongs in `store/`.
