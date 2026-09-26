// Access token + signed-in user. "Remember me" keeps them in localStorage; otherwise they
// live in sessionStorage and disappear when the tab closes.
const TOKEN_KEY = 'auth.token'
const USER_KEY = 'auth.user'

function read(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function getToken() {
  return read(TOKEN_KEY)
}

export function getUser() {
  const raw = read(USER_KEY)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(token, user, remember) {
  clearSession()
  const storage = remember ? localStorage : sessionStorage
  try {
    storage.setItem(TOKEN_KEY, token)
    storage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Storage blocked (private mode); the user will simply have to log in again.
  }
}

export function updateUser(user) {
  const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage
  try {
    storage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      storage.removeItem(TOKEN_KEY)
      storage.removeItem(USER_KEY)
    } catch {
      // ignore
    }
  }
}
