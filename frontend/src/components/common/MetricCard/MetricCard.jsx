// Tone classes are spelled out in full so Tailwind can see them.
const TONES = {
  green: { badge: 'bg-primary-soft border-primary-line text-primary', bar: 'bg-green' },
  cyan: { badge: 'bg-cyan-50 border-cyan-200 text-cyan-700', bar: 'bg-cyan' },
  orange: { badge: 'bg-amber-50 border-amber-200 text-amber-700', bar: 'bg-orange' },
}

export default function MetricCard({ label, status, value, unit, rangeLabel, rangeText, progress, tone = 'green' }) {
  const t = TONES[tone]

  return (
    <div className="panel px-5 py-4 flex flex-col">
      <div className="flex items-center gap-3">
        <p className="m-0 tabular-nums text-[0.9375rem] tracking-[0.08em] text-text/80 uppercase">{label}</p>
        <span className={`ml-auto px-3 py-1 rounded-full border tabular-nums text-xs font-semibold tracking-[0.08em] uppercase ${t.badge}`}>
          {status}
        </span>
      </div>

      <p className="m-0 mt-3 tabular-nums text-3xl font-semibold tracking-tight text-text">
        {value}
        <span className="ml-1 text-lg font-normal text-muted">{unit}</span>
      </p>

      <div className="mt-3 flex items-center justify-between tabular-nums text-sm">
        <span className="text-muted">{rangeLabel}</span>
        <span className="text-text">{rangeText}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-canvas overflow-hidden">
        <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  )
}
