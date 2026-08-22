import { useId, useMemo } from 'react'

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 280
const PADDING = { top: 20, right: 10, bottom: 24, left: 36 }
const AXIS_LABEL_CLASS = 'text-[11px] font-semibold fill-[rgba(43,48,52,0.4)]'

function buildPoints(data, min, max) {
  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom
  const range = max - min || 1

  return data.map((value, index) => ({
    x: PADDING.left + (index / (data.length - 1)) * innerWidth,
    y: PADDING.top + innerHeight - ((value - min) / range) * innerHeight,
  }))
}

function toLinePath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export default function RealtimeChart({ series, categories, yTicks = [0, 20, 40, 60, 80, 100], highlightSeriesId }) {
  const gradientId = useId()
  const min = yTicks[0]
  const max = yTicks[yTicks.length - 1]
  const innerHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom
  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right

  const plotted = useMemo(
    () => series.map((s) => ({ ...s, points: buildPoints(s.data, min, max) })),
    [series, min, max],
  )

  const highlighted = plotted.find((s) => s.id === highlightSeriesId) ?? plotted[0]
  const peakIndex = highlighted.points.reduce(
    (best, p, i) => (p.y < highlighted.points[best].y ? i : best),
    0,
  )
  const peakPoint = highlighted.points[peakIndex]

  return (
    <div className="flex flex-col gap-3">
      <svg className="w-full h-auto" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label="Realtime sensor readings">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={highlighted.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={highlighted.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = PADDING.top + innerHeight - ((tick - min) / (max - min)) * innerHeight
          return (
            <g key={tick}>
              <line x1={PADDING.left} y1={y} x2={VIEW_WIDTH - PADDING.right} y2={y} stroke="#ebebeb" strokeWidth="1" />
              <text x={PADDING.left - 8} y={y + 4} className={AXIS_LABEL_CLASS} textAnchor="end">
                {tick}%
              </text>
            </g>
          )
        })}

        {categories.map((label, index) => (
          <text
            key={label}
            x={PADDING.left + (index / (categories.length - 1)) * innerWidth}
            y={VIEW_HEIGHT - 4}
            className={AXIS_LABEL_CLASS}
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        <path
          d={`${toLinePath(highlighted.points)} L${highlighted.points.at(-1).x},${PADDING.top + innerHeight} L${highlighted.points[0].x},${PADDING.top + innerHeight} Z`}
          fill={`url(#${gradientId})`}
        />

        {plotted.map((s) => (
          <path key={s.id} d={toLinePath(s.points)} fill="none" stroke={s.color} strokeWidth="2" />
        ))}

        {highlighted.points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === peakIndex ? 5 : 3} fill={highlighted.color} stroke="#fff" strokeWidth="1.5" />
        ))}

        <g transform={`translate(${peakPoint.x}, ${peakPoint.y - 26})`}>
          <rect x="-20" y="-2" width="40" height="20" rx="4" fill={highlighted.color} />
          <text x="0" y="12" textAnchor="middle" className="text-[11px] font-bold fill-white">
            {highlighted.data[peakIndex]}%
          </text>
        </g>
      </svg>

      <ul className="list-none flex justify-center gap-6 m-0 p-0 text-[13.6px] font-medium">
        {series.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1.5" style={{ color: s.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
