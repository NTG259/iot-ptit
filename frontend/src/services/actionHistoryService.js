import { apiClient } from './apiClient'

/** params: { search, status, action, deviceType, from, to, newestFirst, page, size } — status/action/deviceType may be arrays. */
export function getActionHistories(params) {
  return apiClient.get('/action-histories', params)
}
