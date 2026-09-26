import { useState } from 'react'
import AppShell from '@/components/layout/AppShell/AppShell'
import Badge from '@/components/common/Badge/Badge'
import Input from '@/components/common/Input/Input'
import { sensorService } from '@/services'
import useApi from '@/hooks/useApi'

const TYPE_TONES = { TEMPERATURE: 'green', HUMIDITY: 'cyan', LIGHT: 'orange' }

// Inputs hold strings; an empty box means "no limit on this side".
const toText = (value) => (value == null ? '' : String(value))
const toNumber = (text) => (text.trim() === '' ? null : Number(text))

function ThresholdCard({ sensor, threshold }) {
  const [saved, setSaved] = useState({ min: threshold.minValue, max: threshold.maxValue })
  const [min, setMin] = useState(toText(threshold.minValue))
  const [max, setMax] = useState(toText(threshold.maxValue))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const minValue = toNumber(min)
  const maxValue = toNumber(max)
  const error =
    Number.isNaN(minValue) || Number.isNaN(maxValue)
      ? 'Enter a number.'
      : minValue != null && maxValue != null && minValue > maxValue
        ? 'Min must not be greater than max.'
        : null
  const dirty = minValue !== saved.min || maxValue !== saved.max

  async function save(nextMin, nextMax) {
    setSaving(true)
    setMessage(null)
    try {
      const result = await sensorService.updateThreshold(sensor.code, { minValue: nextMin, maxValue: nextMax })
      setSaved({ min: result.minValue, max: result.maxValue })
      setMin(toText(result.minValue))
      setMax(toText(result.maxValue))
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
        if (!error && dirty) save(minValue, maxValue)
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
        <Input
          id={`${sensor.code}-min`}
          label={`Min${sensor.unit ? ` (${sensor.unit})` : ''}`}
          type="number"
          step="any"
          placeholder="No limit"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <Input
          id={`${sensor.code}-max`}
          label={`Max${sensor.unit ? ` (${sensor.unit})` : ''}`}
          type="number"
          step="any"
          placeholder="No limit"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <p className={`m-0 text-sm ${error || message?.tone === 'error' ? 'text-red' : 'text-primary'}`}>
          {error ?? message?.text}
        </p>
        <button
          type="button"
          disabled={saving || (saved.min == null && saved.max == null)}
          onClick={() => save(null, null)}
          className="ml-auto h-10 px-4 rounded-lg border border-outline bg-white text-[0.9375rem] text-text cursor-pointer hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={saving || !dirty || error != null}
          className="h-10 px-5 rounded-lg bg-primary text-white text-[0.9375rem] font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
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
