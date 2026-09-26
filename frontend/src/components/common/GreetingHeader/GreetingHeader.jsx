import useNow from '@/hooks/useNow'

function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'GOOD MORNING'
  if (hour < 18) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

export default function GreetingHeader({ name, subtitle }) {
  const now = useNow()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="shrink-0 flex items-center gap-4">
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 tabular-nums text-sm font-semibold tracking-[0.1em] text-primary">
          {greetingFor(now)}
        </p>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] text-text">{name}</h1>
        {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="panel ml-auto flex items-center gap-3 px-4 py-2.5 tabular-nums text-[0.9375rem] text-text whitespace-nowrap">
        {weekday}, {day} / {month}
        <span className="w-1 h-1 rounded-full bg-outline" />
        <span className="text-primary">{time}</span>
      </div>
    </header>
  )
}
