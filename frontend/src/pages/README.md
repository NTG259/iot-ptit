# pages

**Responsibility:** route-level components — the entry point for one screen/route.

- Belongs here: one folder per route (`Home/Home.jsx`), composing
  `components/layout`, `components/common`, `hooks`, and `services` to render a screen.
- Doesn't belong here: reusable UI (`components/`), API calls themselves
  (`services/`), or route path strings (`routes/`).
