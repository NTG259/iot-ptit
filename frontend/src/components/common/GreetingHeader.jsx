import useNow from '@/hooks/useNow'
import { inVietnam } from '@/utils/format'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function greetingFor(hour) {
  if (hour < 12) return 'GOOD MORNING'
  if (hour < 18) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

/** Greeting and clock in Vietnam time, like the rest of the app, whatever the browser's time zone. */
export default function GreetingHeader({ name, subtitle }) {
  const vn = inVietnam(useNow())
  const hour = vn.getUTCHours()
  const day = String(vn.getUTCDate()).padStart(2, '0')
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0')
  const time = `${String(hour % 12 || 12).padStart(2, '0')}:${String(vn.getUTCMinutes()).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`

  return (
    <header className="shrink-0 flex items-center gap-4">
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 tabular-nums text-sm font-semibold tracking-[0.1em] text-primary">
          {greetingFor(hour)}
        </p>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] text-text">{name}</h1>
        {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="panel ml-auto flex items-center gap-3 px-4 py-2.5 tabular-nums text-[0.9375rem] text-text whitespace-nowrap">
        {WEEKDAYS[vn.getUTCDay()]}, {day} / {month}
        <span className="w-1 h-1 rounded-full bg-outline" />
        <span className="text-primary">{time}</span>
      </div>
    </header>
  )
}
