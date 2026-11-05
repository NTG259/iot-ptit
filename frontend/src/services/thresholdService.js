import { apiClient } from './apiClient'

// GET /thresholds → [{ sensorCode, sensorLabel, maxValue }, ...]
export function getThresholds() {
  return apiClient.get('/thresholds')
}

// PUT /thresholds/{sensorCode} → { sensorCode, sensorLabel, maxValue }
export function updateThreshold(sensorCode, { maxValue }) {
  return apiClient.put(`/thresholds/${sensorCode}`, { maxValue })
}
