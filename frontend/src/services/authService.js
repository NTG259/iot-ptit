import { apiClient } from './apiClient'

export function login(credentials) {
  return apiClient.post('/auth/login', credentials)
}
