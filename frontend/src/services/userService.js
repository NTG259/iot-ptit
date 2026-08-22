import { apiClient } from './apiClient'

export function getProfile() {
  return apiClient.get('/users/me')
}

export function updateProfile(data) {
  return apiClient.put('/users/me', data)
}
