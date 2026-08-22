# utils

**Responsibility:** pure, framework-agnostic helper functions.

- Belongs here: formatters, validators, parsers — same input always gives the same
  output, no side effects.
- Doesn't belong here: anything with side effects, React imports, or DOM access —
  side-effecting reusable logic belongs in `hooks/` instead.
