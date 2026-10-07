import { Switch } from 'antd'

/** LedDeviceCard: thẻ một đèn LED gồm tên, nhãn ON/OFF và công tắc bật tắt (xanh = đang bật). */
export default function LedDeviceCard({ name, on, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-outline rounded-xl bg-canvas/60">
      <p className={`m-0 text-base font-semibold ${on ? 'text-text' : 'text-text/70'}`}>{name}</p>
      <span
        className={`px-2 py-0.5 rounded-full tabular-nums text-xs font-semibold tracking-[0.08em] ${
          on ? 'bg-primary-soft text-primary' : 'bg-slate-100 text-muted'
        }`}
      >
        {on ? 'ON' : 'OFF'}
      </span>
      <span className="ml-auto">
        <Switch checked={on} onChange={onToggle} aria-label={`Toggle ${name}`} />
      </span>
    </div>
  )
}
