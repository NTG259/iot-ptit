# services

**Responsibility:** all network/API access, built on `apiClient.js`.

- Belongs here: one module per resource (`deviceService.js`, `authService.js`)
  wrapping `apiClient` calls and mapping responses to plain JS objects.
- Doesn't belong here: `fetch()` calls made directly from components/pages/hooks —
  always go through a service. No React imports here.
