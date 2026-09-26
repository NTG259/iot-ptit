import { apiClient } from './apiClient'

/** params: { search, status, action, deviceType, from, to, page, size } */
export function getActionHistories(params) {
  return apiClient.get('/action-histories', params)
}
