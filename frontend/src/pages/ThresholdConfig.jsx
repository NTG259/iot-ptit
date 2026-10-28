import { useState, useEffect } from 'react'
import { Button, InputNumber, Alert, Spin } from 'antd'
import { LuCheck } from 'react-icons/lu'
import AppShell from '@/components/layout/AppShell'
import { getThresholds, updateThreshold } from '@/services/thresholdService'
import './ThresholdConfig.css'

export default function ThresholdConfig() {
  const [thresholds, setThresholds] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)   // sensorCode currently saving
  const [saved, setSaved]           = useState(new Set()) // sensorCodes showing ✓
  const [error, setError]           = useState(null)

  useEffect(() => {
    getThresholds()
      .then(setThresholds)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(sensorCode, value) {
    setThresholds(prev =>
      prev.map(t => t.sensorCode === sensorCode ? { ...t, maxValue: value } : t)
    )
  }

  async function handleSave(t) {
    setSaving(t.sensorCode)
    try {
      const updated = await updateThreshold(t.sensorCode, { maxValue: t.maxValue, enabled: true })
      setThresholds(prev => prev.map(x => x.sensorCode === updated.sensorCode ? updated : x))
      setSaved(prev => new Set(prev).add(t.sensorCode))
      setTimeout(() => setSaved(prev => { const n = new Set(prev); n.delete(t.sensorCode); return n }), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <AppShell breadcrumb="Thresholds" title="Threshold Config" subtitle="Set the upper limit for each sensor. Readings that exceed the limit are counted in the alert chart.">
      {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}

      {loading ? (
        <Spin />
      ) : (
        <div className="threshold-config__table">
          <div className="threshold-config__header">
            <span>Sensor</span>
            <span>Max Value</span>
            <span />
          </div>

          {thresholds.map(t => {
            const isSaving = saving === t.sensorCode
            const isSaved  = saved.has(t.sensorCode)
            return (
              <div key={t.sensorCode} className="threshold-config__row">
                <span className="threshold-config__label">{t.sensorLabel}</span>

                <InputNumber
                  value={t.maxValue}
                  min={0}
                  step={0.5}
                  onChange={val => handleChange(t.sensorCode, val)}
                />

                <Button
                  type="primary"
                  loading={isSaving}
                  onClick={() => handleSave(t)}
                  className={isSaved ? 'threshold-config__btn--saved' : ''}
                  icon={isSaved ? <LuCheck /> : null}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
