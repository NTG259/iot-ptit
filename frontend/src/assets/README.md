# assets

**Responsibility:** static files imported directly into code (images, icons, fonts).

- Belongs here: anything referenced via `import x from '@/assets/...'`.
- Doesn't belong here: files served as-is without being imported by JS/CSS — those
  go in the top-level `public/` folder instead.
