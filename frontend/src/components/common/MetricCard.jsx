/**
 * MetricCard: thẻ chỉ số của một cảm biến trên Dashboard: tên và giá trị mới nhất kèm đơn vị.
 * - `config`: cấu hình hiển thị của cảm biến, vd NHIET_DO trong `@/constants/sensors` (nhãn, đơn vị, số chữ số thập phân).
 * - `sensor`: dữ liệu backend (lastValue); chưa tải xong thì là CAM_BIEN_TRONG.
 */
export default function MetricCard({ config, sensor }) {
  const giaTri = sensor.lastValue

  return (
    <div className="panel px-4 py-3 flex flex-col">
      <p className="m-0 tabular-nums text-[0.9375rem] tracking-[0.08em] text-text/80 uppercase">{config.label}</p>

      <p className="m-0 mt-1 tabular-nums text-2xl font-semibold tracking-tight text-text">
        {giaTri === null ? '—' : giaTri.toFixed(config.decimals)}
        <span className="ml-1 text-base font-normal text-muted">{config.unit}</span>
      </p>
    </div>
  )
}
