# config

**Responsibility:** the single place that reads `import.meta.env`.

- Belongs here: environment/build-time values (API base URL, feature flags, mode).
- Doesn't belong here: fixed values that never change per environment — those are
  `constants/`. Nowhere else in the app should reference `import.meta.env` directly.
