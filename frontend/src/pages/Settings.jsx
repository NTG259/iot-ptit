import { useState } from 'react'
import { Button, InputNumber } from 'antd'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/common/Badge'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'

const TYPE_TONES = { TEMPERATURE: 'green', HUMIDITY: 'cyan', LIGHT: 'orange' }

// An empty box (null) means "no limit on this side".
const LABEL_CLASS = 'block mb-1.5 text-[0.8125rem] font-semibold text-text/70'

function ThresholdCard({ sensor, threshold }) {
  const [saved, setSaved] = useState({ min: threshold.minValue, max: threshold.maxValue })
  const [min, setMin] = useState(threshold.minValue)
  const [max, setMax] = useState(threshold.maxValue)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const error = min != null && max != null && min > max ? 'Min must not be greater than max.' : null
  const dirty = min !== saved.min || max !== saved.max

  async function save(nextMin, nextMax) {
    setSaving(true)
    setMessage(null)
    try {
      const result = await sensorService.updateThreshold(sensor.code, { minValue: nextMin, maxValue: nextMax })
      setSaved({ min: result.minValue, max: result.maxValue })
      setMin(result.minValue)
      setMax(result.maxValue)
      setMessage({ tone: 'ok', text: 'Saved.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const value = sensor.lastValue
  const status =
    value == null
      ? { tone: 'gray', label: 'No data' }
      : saved.min != null && value < saved.min
        ? { tone: 'red', label: 'Below min' }
        : saved.max != null && value > saved.max
          ? { tone: 'red', label: 'Above max' }
          : { tone: 'green', label: 'In range' }

  return (
    <form
      className="panel px-5 py-4 flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!error && dirty) save(min, max)
      }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-semibold text-text">{sensor.name}</h2>
          <p className="m-0 tabular-nums text-sm text-muted">#{sensor.code}</p>
        </div>
        <span className="ml-auto">
          <Badge tone={TYPE_TONES[sensor.type]}>{sensor.unit || 'raw'}</Badge>
        </span>
      </div>

      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-outline bg-canvas/60">
        <span className="text-sm text-muted">Current reading</span>
        <span className="flex items-center gap-3">
          <span className="tabular-nums text-lg font-semibold text-text">
            {value == null ? '—' : value}
            {value != null && sensor.unit && <span className="ml-1 text-sm font-normal text-muted">{sensor.unit}</span>}
          </span>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ['min', 'Min', min, setMin],
          ['max', 'Max', max, setMax],
        ].map(([key, label, value, setValue]) => (
          <div key={key}>
            <label htmlFor={`${sensor.code}-${key}`} className={LABEL_CLASS}>
              {label}
              {sensor.unit ? ` (${sensor.unit})` : ''}
            </label>
            <InputNumber id={`${sensor.code}-${key}`} placeholder="No limit" value={value} onChange={setValue} className="!w-full" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <p className={`m-0 text-sm ${error || message?.tone === 'error' ? 'text-red' : 'text-primary'}`}>
          {error ?? message?.text}
        </p>
        <Button className="ml-auto" disabled={saving || (saved.min == null && saved.max == null)} onClick={() => save(null, null)}>
          Clear
        </Button>
        <Button type="primary" htmlType="submit" loading={saving} disabled={!dirty || error != null}>
          Save
        </Button>
      </div>
    </form>
  )
}

export default function Settings() {
  const { data, error, loading } = useApi(async () => {
    const { items } = await sensorService.getSensors({ size: 50 })
    const thresholds = await Promise.all(items.map((s) => sensorService.getThreshold(s.code)))
    return items.map((sensor, i) => ({ sensor, threshold: thresholds[i] }))
  }, [])

  return (
    <AppShell
      breadcrumb="Settings"
      title="Sensor Thresholds"
      subtitle="Readings outside a sensor's min/max raise an alert. Leave a side empty for no limit."
    >
      {error && <p className="m-0 shrink-0 px-4 py-2.5 rounded-lg bg-red/10 text-red text-sm">Could not load sensors: {error.message}</p>}
      {loading && <p className="m-0 text-muted">Loading…</p>}

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        {data?.map(({ sensor, threshold }) => (
          <ThresholdCard key={sensor.code} sensor={sensor} threshold={threshold} />
        ))}
      </div>
    </AppShell>
  )
}
