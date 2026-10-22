import { Switch } from 'antd'
import './LedDeviceCard.css'

/** LedDeviceCard: thẻ một đèn LED gồm tên, nhãn ON/OFF và công tắc bật tắt (xanh = đang bật). */
// status: 'idle' | 'pending' | 'success'
// readOnly: true → ẩn công tắc, chỉ hiển thị trạng thái (dùng cho Warning LED tự động)
export default function LedDeviceCard({ name, on, onToggle, status = 'idle', readOnly = false }) {
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

  const cardClass = ['led-card', readOnly && on ? 'led-card--warning-on' : ''].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      <p className={nameClass}>{name}</p>
      <span className={stateClass}>{stateText}</span>
      {!readOnly && (
        <span className="led-card__switch">
          <Switch checked={on} onChange={onToggle} loading={status === 'pending'} aria-label={`Toggle ${name}`} />
        </span>
      )}
    </div>
  )
}
