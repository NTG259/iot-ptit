import { apiClient } from './apiClient'

export function getDevices() {
  return apiClient.get('/devices')
}

/** action: 'TURN_ON' | 'TURN_OFF'. Resolves to the new action history row (usually PENDING). */
export function control(code, action) {
  return apiClient.post(`/devices/${code}/control`, { action })
}

export function controlAll(action) {
  return apiClient.post('/devices/control-all', { action })
}
