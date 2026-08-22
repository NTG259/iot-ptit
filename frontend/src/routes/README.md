# routes

**Responsibility:** route path constants (`paths.js`) plus the router configuration (`AppRouter.jsx`, react-router-dom).

- Belongs here: `ROUTES.DASHBOARD = '/'` style path constants, and the
  `createBrowserRouter` config that maps each path to a page.
- Doesn't belong here: the page components rendered at those routes — those live in
  `pages/`. Import `ROUTES` (not raw path strings) wherever a link or redirect needs
  a path, so route strings change in exactly one place.
