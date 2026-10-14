import { Switch } from 'antd'
import './LedDeviceCard.css'

/** LedDeviceCard: thẻ một đèn LED gồm tên, nhãn ON/OFF và công tắc bật tắt (xanh = đang bật). */
// status: 'idle' | 'pending' | 'success'
export default function LedDeviceCard({ name, on, onToggle, status = 'idle' }) {
  let nameClass = 'led-card__name led-card__name--off'
  let stateClass = 'led-card__state led-card__state--off'
  let stateText = 'OFF'
  if (on) {
    nameClass = 'led-card__name led-card__name--on'
    stateClass = 'led-card__state led-card__state--on'
    stateText = 'ON'
  }
  if (status === 'pending') {
    stateClass = 'led-card__state led-card__state--pending'
    stateText = 'Pending'
  }
  if (status === 'success') {
    stateClass = 'led-card__state led-card__state--success'
    stateText = 'Success'
  }

  return (
    <div className="led-card">
      <p className={nameClass}>{name}</p>
      <span className={stateClass}>{stateText}</span>
      <span className="led-card__switch">
        <Switch checked={on} onChange={onToggle} loading={status === 'pending'} aria-label={`Toggle ${name}`} />
      </span>
    </div>
  )
}
