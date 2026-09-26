import { apiClient } from './apiClient'
import { clearSession, saveSession } from './session'

export async function login({ username, password, remember }) {
  const { accessToken, user } = await apiClient.post('/auth/login', { username, password })
  saveSession(accessToken, user, remember)
  return user
}

// JWTs are stateless, so logging out only forgets the token on this device.
export function logout() {
  clearSession()
}
