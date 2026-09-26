import { apiClient } from './apiClient'

/** params: { search, types, status, updatedSince, newestFirst, page, size } */
export function getSensors(params) {
  return apiClient.get('/sensors', params)
}

/** params: { from, to, buckets } — with `buckets`, each point is that slot's average. */
export function getSensorData(code, params) {
  return apiClient.get(`/sensors/${code}/data`, params)
}

export function getThreshold(code) {
  return apiClient.get(`/sensors/${code}/threshold`)
}

export function updateThreshold(code, { minValue, maxValue }) {
  return apiClient.put(`/sensors/${code}/threshold`, { minValue, maxValue })
}
