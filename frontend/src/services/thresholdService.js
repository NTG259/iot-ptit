import { apiClient } from './apiClient'

// GET /thresholds → [{ sensorCode, sensorLabel, maxValue, enabled }, ...]
export function getThresholds() {
  return apiClient.get('/thresholds')
}

// PUT /thresholds/{sensorCode} → { sensorCode, sensorLabel, maxValue, enabled }
export function updateThreshold(sensorCode, { maxValue, enabled }) {
  return apiClient.put(`/thresholds/${sensorCode}`, { maxValue, enabled })
}
