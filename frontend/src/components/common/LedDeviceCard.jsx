import { Switch } from 'antd'
import './LedDeviceCard.css'

/** LedDeviceCard: thẻ một đèn LED gồm tên, nhãn ON/OFF và công tắc bật tắt (xanh = đang bật). */
export default function LedDeviceCard({ name, on, onToggle }) {
  // Đèn bật thì dùng biến thể --on (xanh), tắt thì --off (xám); màu cụ thể nằm trong LedDeviceCard.css.
  let nameClass = 'led-card__name led-card__name--off'
  let stateClass = 'led-card__state led-card__state--off'
  let stateText = 'OFF'
  if (on) {
    nameClass = 'led-card__name led-card__name--on'
    stateClass = 'led-card__state led-card__state--on'
    stateText = 'ON'
  }

  return (
    <div className="led-card">
      <p className={nameClass}>{name}</p>
      <span className={stateClass}>{stateText}</span>
      <span className="led-card__switch">
        <Switch checked={on} onChange={onToggle} aria-label={`Toggle ${name}`} />
      </span>
    </div>
  )
}
