# styles

**Responsibility:** shared design tokens, imported once app-wide.

- Belongs here: the Tailwind v4 `@theme` block in `variables.css` (colors, fonts —
  `--color-primary`, `--font-sans`, ...), imported once from `src/index.css`. Each
  token there also becomes a real Tailwind utility (`bg-primary`, `text-green`, ...).
- Doesn't belong here: component-specific styling — that's Tailwind utility classes
  written directly in the component's JSX, not a separate stylesheet.
