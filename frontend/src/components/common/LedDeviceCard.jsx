import Switch from './Switch'

// `pending`: a command was sent and we're waiting for the ESP8266 to confirm the new state.
export default function LedDeviceCard({ name, on, pending = false, onToggle }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border border-outline rounded-xl bg-canvas/60">
      <p className={`m-0 text-base font-semibold ${on ? 'text-text' : 'text-text/70'}`}>{name}</p>
      <span
        className={`px-2 py-0.5 rounded-full tabular-nums text-xs font-semibold tracking-[0.08em] ${
          on ? 'bg-primary-soft text-primary' : 'bg-slate-100 text-muted'
        }`}
      >
        {pending ? '…' : on ? 'ON' : 'OFF'}
      </span>
      <span className="ml-auto">
        <Switch checked={on} onChange={onToggle} disabled={pending} label={`Toggle ${name}`} />
      </span>
    </div>
  )
}
