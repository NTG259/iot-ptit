# components/layout

**Responsibility:** structural chrome shared across pages.

- Belongs here: `Header`, `Footer`, `Sidebar`, `PageContainer` — components that
  define page scaffolding and compose `components/common` + page content.
- Doesn't belong here: page-specific content, or one-off UI only used on a single page
  — put that in `pages/<Page>/`.
