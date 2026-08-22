# Frontend architecture

Layer-first structure. Each folder has one job; import via the `@` alias
(`@/components`, `@/hooks`, ...) instead of relative `../../..` chains.

```
src/
├── assets/      # images, fonts, static files
├── components/
│   ├── common/  # generic, reusable, presentation-only UI (Button, Input, Card...)
│   └── layout/  # page scaffolding (Header, Footer, Sidebar...)
├── config/      # reads import.meta.env once; nothing else touches it directly
├── constants/   # enums / fixed values that don't change per environment
├── contexts/    # React context providers + their hooks
├── hooks/       # reusable custom hooks
├── pages/       # route-level components, one folder per page
├── routes/      # route path constants, decoupled from whichever router lib is chosen
├── services/    # API calls, built on services/apiClient.js
├── store/       # shared app state, once something needs it beyond local component state
├── styles/      # Tailwind v4 theme tokens; components style themselves with utility classes
└── utils/       # pure helper functions, no React/DOM imports
```

## Conventions

- **Styling is Tailwind utility classes**, written directly in each component's JSX.
  Design tokens (`bg-primary`, `text-green`, `border-outline`, ...) come from the
  `@theme` block in `styles/variables.css` — reach for those before an arbitrary
  value (`bg-[#4880ff]`), and reach for `@utility` in `index.css` only for a class
  combination repeated across 3+ components (see `card-grid`).
- **One component per folder**: `components/common/Button/Button.jsx`. Import the
  concrete file directly (`@/components/common/Button/Button`) — no barrel `index.js`.
  Every barrel in this repo turned out to be dead code (nothing ever imported through
  one except `services/index.js`), so the convention is direct imports; `services/`
  is the deliberate exception because every service call site wants the same
  `{ authService, userService }` shape rather than a dozen one-off file imports.
- **Imports**: use the `@` alias for anything outside the current folder; relative
  imports (`./`, `../`) are fine for siblings inside the same feature/component folder.
- **Direction of dependency**: `pages` → `components`/`hooks`/`services`/`store` →
  `utils`/`constants`/`config`. Lower layers (`utils`, `constants`, `config`) never
  import from higher ones (`components`, `pages`).
- New env vars go through `config/`, read once via `import.meta.env`, not scattered
  across the codebase.

These folders are scaffolded ahead of need — most are still empty placeholders.
Fill them in as real components/pages/hooks are built rather than leaving code in
`App.jsx`.

Each folder has its own `README.md` spelling out what belongs there and what
doesn't — check it before adding a file if you're unsure where it goes.
