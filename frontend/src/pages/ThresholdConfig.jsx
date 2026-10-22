import { useState, useEffect } from 'react'
import { Button, InputNumber, Switch, Alert, Spin } from 'antd'
import AppShell from '@/components/layout/AppShell'
import { getThresholds, updateThreshold } from '@/services/thresholdService'
import './ThresholdConfig.css'

export default function ThresholdConfig() {
  const [thresholds, setThresholds] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)   // sensorCode being saved
  const [error, setError]           = useState(null)

  useEffect(() => {
    getThresholds()
      .then(setThresholds)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(sensorCode, field, value) {
    setThresholds(prev =>
      prev.map(t => t.sensorCode === sensorCode ? { ...t, [field]: value } : t)
    )
  }

  async function handleSave(t) {
    setSaving(t.sensorCode)
    try {
      const updated = await updateThreshold(t.sensorCode, { maxValue: t.maxValue, enabled: t.enabled })
      setThresholds(prev => prev.map(x => x.sensorCode === updated.sensorCode ? updated : x))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <AppShell breadcrumb="Thresholds" title="Threshold Config" subtitle="Set the upper limit for each sensor. Exceeding it triggers a BLINK command to the warning LED.">
      {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}

      {loading ? (
        <Spin />
      ) : (
        <div className="threshold-config__table">
          <div className="threshold-config__header">
            <span>Sensor</span>
            <span>Max Value</span>
            <span>Enabled</span>
            <span />
          </div>

          {thresholds.map(t => (
            <div key={t.sensorCode} className="threshold-config__row">
              <span className="threshold-config__label">{t.sensorLabel}</span>

              <InputNumber
                value={t.maxValue}
                min={0}
                step={0.5}
                onChange={val => handleChange(t.sensorCode, 'maxValue', val)}
              />

              <Switch
                checked={t.enabled}
                onChange={val => handleChange(t.sensorCode, 'enabled', val)}
              />

              <Button
                type="primary"
                loading={saving === t.sensorCode}
                onClick={() => handleSave(t)}
              >
                Save
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
