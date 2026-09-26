import { apiClient } from './apiClient'
import { updateUser } from './session'

export async function getProfile() {
  const user = await apiClient.get('/users/me')
  updateUser(user)
  return user
}

// PUT replaces the whole profile, so send every field, not just the changed ones.
export async function updateProfile(data) {
  const user = await apiClient.put('/users/me', data)
  updateUser(user)
  return user
}
