import { config } from '@/config'
import { ROUTES } from '@/routes/paths'
import { clearSession, getToken } from './session'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Drops empty filters ('' / null / undefined / 'all') so callers can pass UI state straight through.
function toQuery(params) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'all') continue
    search.set(key, Array.isArray(value) ? value.join(',') : value)
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

// Thin fetch wrapper so services never call fetch() directly. The backend wraps every body as
// { success, message, data }; this returns `data` and throws ApiError with `message` on failure.
async function request(path, { params, headers, ...options } = {}) {
  const token = getToken()
  const res = await fetch(`${config.apiBaseUrl}${path}${toQuery(params)}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  })

  const body = res.status === 204 ? null : await res.json().catch(() => null)

  if (res.status === 401 && token) {
    // Token expired or revoked: drop it and send the user back to the login page.
    clearSession()
    window.location.assign(ROUTES.LOGIN)
  }
  if (!res.ok || body?.success === false) {
    throw new ApiError(body?.message ?? `Request failed: ${res.status} ${res.statusText}`, res.status)
  }
  // A 2xx without our JSON envelope (e.g. the dev server's index.html when the /api proxy is down)
  // must fail loudly rather than hand callers a null they don't expect.
  if (res.status !== 204 && body == null) {
    throw new ApiError(`Unexpected response from ${path}: not JSON — is the backend reachable?`, res.status)
  }

  return body?.data ?? null
}

export const apiClient = {
  get: (path, params, options) => request(path, { ...options, params, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
