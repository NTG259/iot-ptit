# components/common

**Responsibility:** generic, reusable, presentation-only UI primitives.

- Belongs here: `Button`, `Input`, `Card`, `Modal`, `Spinner` — components with no
  knowledge of a specific feature or API, driven entirely by props.
- Doesn't belong here: anything that fetches data, reads route params, or knows
  about a specific page/feature — that's `pages/` or a feature's own components.
- One component per folder: `Button/Button.jsx`. Import the file directly
  (`@/components/common/Button/Button`) — no barrel `index.js`.
