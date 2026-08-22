# hooks

**Responsibility:** reusable custom hooks, used by 2+ components/pages.

- Belongs here: `useDebounce`, `useLocalStorage`, `useFetch` — framework logic with
  no rendered output.
- Doesn't belong here: a hook only ever used by one component — keep it co-located
  with that component instead of promoting it here prematurely.
