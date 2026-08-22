# constants

**Responsibility:** fixed values and enums that don't change between environments.

- Belongs here: role names, status enums, pagination limits, regex patterns.
- Doesn't belong here: environment-dependent values (API URLs, keys) — that's
  `config/`. Route paths live in `routes/`, not here.
