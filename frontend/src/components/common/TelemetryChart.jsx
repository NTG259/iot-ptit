import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { joinUnit } from '@/constants/sensors'
import './TelemetryChart.css'

export default function TelemetryChart({
  series,         // danh sách các đường cần vẽ — mỗi đường có màu, tên, giá trị và hàm hiển thị
  labels,         // 7 cái giờ hiện dưới trục ngang, ví dụ ["14:01", "14:05", ...]
  times = [],     // 25 cái giờ đầy đủ — hiện trong hộp thông tin khi rê chuột vào điểm
  yTicks,         // các mức số hiện bên trục dọc trái, ví dụ [0,10,20,30,40,50]
  unit = '',      // chữ đơn vị gắn sau số ở trục trái, ví dụ '°C'
  rightYTicks,    // các mức số cho trục dọc phải — có giá trị thì hiện thêm trục phải, không có thì ẩn
  rightUnit = '', // chữ đơn vị gắn sau số ở trục phải, ví dụ '%'
}) {
  // Chưa có số liệu → trả về ô trống giữ chỗ, không vẽ gì cả
  if (!series.length || !series[0].values.length) {
    return <div className="telemetry-chart" />
  }

  // Gom tất cả giá trị của 25 thời điểm thành 1 mảng để thư viện vẽ đường đọc được
  // Mỗi phần tử: { stt: 0, gio: "14:01:06", temperature: 28.3, humidity: 65, ... }
  // - stt: số thứ tự 0–24, dùng để đặt các điểm cách đều nhau trên trục ngang
  // - gio: giờ đo thực, chỉ dùng khi hiện hộp thông tin
  // - các key còn lại: giá trị của từng cảm biến tại thời điểm đó
  const data = series[0].values.map((_, index) => {
    const point = { index, time: times[index] ?? '' }
    for (const s of series) {
      point[s.id] = s.values[index] // ví dụ point["temperature"] = 28.3
    }
    return point
  })

  // Tính vị trí của 7 cái giờ cần hiện dưới trục ngang — trải đều từ đầu đến cuối
  // 25 điểm, 7 nhãn → vị trí là [0, 4, 8, 12, 16, 20, 24]
  const tickIndices = labels.map((_, i) => Math.round((i / (labels.length - 1)) * (data.length - 1)))

  // Giá trị nhỏ nhất và lớn nhất để trục dọc trái không bị thừa khoảng trắng
  const minTick = yTicks[0]
  const maxTick = yTicks[yTicks.length - 1]

  // Có trục dọc phải không — true khi đang xem tab Mix (3 cảm biến cùng lúc)
  const hasDualAxis = !!rightYTicks

  return (
    <div className="telemetry-chart">
      {/* Tự co giãn theo chiều rộng ô chứa */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          // Khi có trục phải thì cần thêm khoảng trống bên phải để nhãn không bị cắt
          margin={{ top: 20, right: hasDualAxis ? 60 : 24, bottom: 10, left: 0 }}
        >
          {/* Các đường kẻ ngang mờ làm nền */}
          <CartesianGrid
            strokeDasharray="4 4" // nét đứt: 4px nét, 4px trống
            stroke="#e2e8f0"       // màu xám nhạt
            vertical={false}       // bỏ đường kẻ dọc, chỉ giữ ngang
          />

          {/* Trục ngang — hiện các mốc giờ bên dưới biểu đồ */}
          <XAxis
            dataKey="index"                                        // đọc trường "index" (0–24) từ mỗi điểm
            type="number"                                          // trục số liên tục, không phải danh sách chữ
            domain={[0, data.length - 1]}                         // bắt đầu từ 0, kết thúc ở điểm cuối
            ticks={tickIndices}                                    // chỉ hiện nhãn tại 7 vị trí đã tính
            tickFormatter={(i) => labels[tickIndices.indexOf(i)] ?? ''} // đổi số thứ tự → chuỗi giờ để hiện
            tick={{ fontSize: 11, fill: '#94a3b8' }}              // chữ nhỏ, màu xám
            tickLine={false}                                       // ẩn vạch gạch dưới mỗi nhãn
            axisLine={false}                                       // ẩn đường ngang của trục
          />

          {/* Trục dọc trái — luôn hiện, dùng cho nhiệt độ (hoặc cảm biến đơn) */}
          <YAxis
            yAxisId="left"                              // tên để các đường biết bám vào trục nào
            domain={[minTick, maxTick]}                 // giới hạn trên/dưới khớp với các mức số
            ticks={yTicks}                              // các mức số cụ thể cần hiện, ví dụ [0,10,20,30,40,50]
            tickFormatter={(v) => joinUnit(v, unit)}    // gắn đơn vị vào sau số, ví dụ 28 → "28°C"
            tick={{ fontSize: 11, fill: '#94a3b8' }}   // chữ nhỏ, màu xám
            tickLine={false}                            // ẩn vạch gạch ngang bên cạnh mỗi số
            axisLine={false}                            // ẩn đường dọc của trục
            width={60}                                  // đặt chiều rộng cố định để nhãn không bị cắt
          />

          {/* Trục dọc phải — chỉ hiện khi tab Mix, dùng cho độ ẩm và ánh sáng (%) */}
          {hasDualAxis && (
            <YAxis
              yAxisId="right"                                              // tên riêng để phân biệt với trục trái
              orientation="right"                                          // vẽ bên phải thay vì bên trái
              domain={[rightYTicks[0], rightYTicks[rightYTicks.length - 1]]} // giới hạn theo mức số trục phải
              ticks={rightYTicks}                                          // các mức số trục phải, ví dụ [0,20,40,60,80,100]
              tickFormatter={(v) => joinUnit(v, rightUnit)}                // gắn đơn vị, ví dụ 60 → "60%"
              tick={{ fontSize: 11, fill: '#94a3b8' }}                    // chữ nhỏ, màu xám
              tickLine={false}                                             // ẩn vạch gạch
              axisLine={false}                                             // ẩn đường dọc
              width={60}                                                   // chiều rộng cố định bên phải
            />
          )}

          {/* Hộp thông tin hiện khi rê chuột vào điểm */}
          <Tooltip
            formatter={(value, name) => {            // value: số thô, name: tên cảm biến ("temperature")
              const s = series.find((s) => s.id === name) // tìm đường tương ứng để lấy hàm định dạng
              return s ? [s.format(value), s.label] : [value, name] // ví dụ ["28.3°C", "Temp"]
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ''} // lấy giờ đo từ điểm đang hover
            contentStyle={{ fontSize: 12 }}          // chữ trong hộp nhỏ hơn chữ thường
          />

          {/* Vẽ một đường cho mỗi cảm biến */}
          {series.map((s) => (
            <Line
              key={s.id + (s.yAxisId ?? 'left')}     // key duy nhất để React nhận ra khi render lại
              type="linear"                           // nối các điểm bằng đoạn thẳng, không cong
              dataKey={s.id}                          // đọc trường nào trong mỗi điểm, ví dụ "temperature"
              yAxisId={s.yAxisId ?? 'left'}           // bám vào trục trái hoặc phải (Dashboard truyền vào)
              stroke={s.color}                        // màu đường, lấy từ cấu hình cảm biến
              strokeWidth={2}                         // độ dày đường
              dot={{ r: 3, fill: '#fff', stroke: s.color, strokeWidth: 1.5 }} // chấm tròn tại mỗi điểm
              activeDot={{ r: 5 }}                    // chấm to hơn khi rê chuột vào
              isAnimationActive={false}               // tắt hiệu ứng chạy vì dữ liệu cập nhật liên tục sẽ gây nháy
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
