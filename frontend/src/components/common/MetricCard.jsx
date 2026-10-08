import './MetricCard.css'

/**
 * MetricCard: thẻ chỉ số của một cảm biến trên Dashboard: tên và giá trị mới nhất kèm đơn vị.
 * - `config`: cấu hình hiển thị của cảm biến, vd TEMPERATURE trong `@/constants/sensors` (nhãn, đơn vị, số chữ số thập phân).
 * - `sensor`: dữ liệu backend (lastValue); chưa tải xong thì là EMPTY_SENSOR.
 */
export default function MetricCard({ config, sensor }) {
  const value = sensor.lastValue

  let valueText = '—'
  if (value !== null) {
    valueText = value.toFixed(config.decimals)
  }

  return (
    <div className="panel metric-card">
      <p className="metric-card__label">{config.label}</p>

      <p className="metric-card__value">
        {valueText}
        <span className="metric-card__unit">{config.unit}</span>
      </p>
    </div>
  )
}
