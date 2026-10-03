import { apiClient } from './apiClient'

/** params: { search, types, status, updatedSince, newestFirst, page, size } */
export function getSensors(params) {
  return apiClient.get('/sensors', params)
}

/** params: { from, to, buckets } — with `buckets`, each point is that slot's average. */
export function getSensorData(code, params) {
  return apiClient.get(`/sensors/${code}/data`, params)
}

/**
 * Stored readings of every sensor (the Sensors history page).
 * params: { search, types, from, to, newestFirst, page, size } — `search` may be a sensor name/code,
 * a value, or a Vietnam-time date/time or time of day such as "2026-10-03 17:20" or "17:20:05".
 */
export function getReadings(params) {
  return apiClient.get('/sensor-data', params)
}

export function getThreshold(code) {
  return apiClient.get(`/sensors/${code}/threshold`)
}

export function updateThreshold(code, { minValue, maxValue }) {
  return apiClient.put(`/sensors/${code}/threshold`, { minValue, maxValue })
}
