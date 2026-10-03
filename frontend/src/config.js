// Central place to read environment/build-time config, so the rest of the app never touches
// import.meta.env directly. Add VITE_-prefixed vars to a .env file to override these.
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  env: import.meta.env.MODE,
}
