# Giải thích `src/pages/Dashboard.jsx`

Dashboard làm 3 việc: hiện số đo mới nhất của 3 cảm biến, vẽ biểu đồ 12 giờ gần nhất, và bật/tắt 3 đèn LED.

Code trong file theo 4 bước:

1. Gọi API (dòng 100–117).
2. Biến đổi dữ liệu nhận về (dòng 119–152).
3. Gửi lệnh LED (dòng 154–176).
4. Vẽ giao diện (dòng 178–240).

> Số dòng tính theo phiên bản hiện tại của `Dashboard.jsx` (241 dòng). Sửa file thì cần cập nhật lại tài liệu này.

---

## 1. Phần cấu hình ở đầu file (dòng 1–70)

| Dòng | Thành phần | Vai trò |
|---|---|---|
| 1–11 | import | Các component con, `sensorService` và `deviceService` (gọi API), `session` (người dùng đang đăng nhập), hai hook `useApi` và `useNow` |
| **13–17** | `SENSORS` | **Bảng cấu hình trung tâm.** Mỗi cảm biến có `code` khớp với mã cảm biến của backend (`temp`, `humi`, `light`), cùng nhãn, đơn vị, số chữ số thập phân, màu, `scale` để quy về trục chung và `fallbackMax` |
| 19–22 | `RANGE_MS`, `SAMPLES`, `LABEL_COUNT`, `Y_TICKS` | Biểu đồ phủ 12 giờ, chia 25 ô, có 7 nhãn trục x, trục y từ 0 đến 50 |
| 24–28 | Các hằng số thời gian | Chu kỳ poll, ngưỡng để một số đo còn tính là "Now", thời gian chờ ESP8266 xác nhận lệnh |
| 30 | `fmt` | Định dạng số theo cảm biến, ví dụ `34.5°C`. Giá trị null hiện `—` |
| 32–44 | `toSeries` | Xếp các điểm dữ liệu vào 25 ô theo `measuredAt`. Ô trống lấy giá trị của ô có dữ liệu gần nhất trước đó; các ô đầu chưa có dữ liệu lấy giá trị đầu tiên. Không có điểm nào thì trả `null` |
| 46–50 | `timeLabels` | Tạo `count` nhãn giờ chia đều từ `from` tới `to`, nhãn cuối là `"Now"` |
| 52–70 | `describeReading` | So số đo với ngưỡng, trả về `status` (Normal / Too low / Too high / No limit / No data), `rangeText` và `progress` (%) cho thanh tiến trình |
| 75–77 | `PanelTitle` | Component con: thẻ `<h2>` làm tiêu đề panel |

---

## 2. Đọc dữ liệu: 4 lời gọi `useApi` (dòng 100–117)

`useApi(load, deps, { intervalMs })` nằm ở `src/hooks/useApi.js`. Hook này:

- gọi `load()` khi component mount, rồi lặp lại sau mỗi `intervalMs`;
- trả về `{ data, error, loading, reload }`;
- khi một lần poll bị lỗi, vẫn giữ `data` của lần thành công trước, nên giao diện không bị nhấp nháy.

| Dòng | Biến | API backend | Chu kỳ | Dữ liệu nhận về |
|---|---|---|---|---|
| **100** | `sensors` | `GET /api/sensors?size=50` | 2 giây | `{ items: [{ code, lastValue, lastReadingAt, … }] }`: số đo mới nhất của từng cảm biến |
| **101–104** | `thresholds` | `GET /api/sensors/{code}/threshold`, gọi 3 lần song song bằng `Promise.all` | Chỉ gọi 1 lần | `[{ sensorCode, minValue, maxValue }]` |
| **106** | `devices` | `GET /api/devices` | 2 giây, hoặc **0,3 giây** khi `awaiting` đúng (dòng 105) | `[{ code, name, state: 'ON' \| 'OFF' }]` |
| **107–117** | `history` | `GET /api/sensors/{code}/data?from=…&to=…&buckets=25`, gọi 3 lần song song | 10 giây | `{ from, to, results }`. `results[i]` là mảng `[{ measuredAt, value }]` của cảm biến thứ i trong `SENSORS`, mỗi điểm là trung bình của một ô |

Ngoài ra:

- **Dòng 97:** `useNow(1000)` cập nhật `now` mỗi giây, để nhãn "Now"/"Last …" và hạn chờ lệnh LED được tính lại liên tục.
- **Dòng 98:** `session.getUser()` đọc người dùng từ localStorage (lưu lúc đăng nhập), dùng để hiện tên ở lời chào.

---

## 3. Biến đổi dữ liệu thô thành dữ liệu để hiển thị (dòng 119–152)

### Thẻ chỉ số (dòng 119–125)

- Dòng 119–120: chuyển mảng `sensors` và `thresholds` thành object tra theo mã cảm biến (`sensorByCode`, `thresholdByCode`).
- Dòng 121–125: `cards` lấy cấu hình trong `SENSORS` rồi gắn thêm `reading` (lấy từ `lastValue`) và `threshold`. Thẻ chỉ số, chú thích biểu đồ và ô "Now" đều đọc từ mảng này.

### Ô ghim ở vạch "Now" trên biểu đồ (dòng 127–133)

- `lastAt` là thời điểm mới nhất trong các `lastReadingAt` của 3 cảm biến.
- Nếu số đo đó cách hiện tại chưa tới 30 giây (`FRESH_MS`), nhãn là `Now`, ngược lại là `Last 2026-…`.
- `items` gồm 3 giá trị đã định dạng, mỗi giá trị kèm màu của cảm biến.

### Biểu đồ (dòng 135–145)

- Dòng 138: `toSeries` dựng mảng 25 giá trị theo đơn vị thật (`values`).
- Dòng 140: `data = values × scale`. Đây là phần quy độ ẩm và ánh sáng về trục chung 0–50.
- Dòng 141: biểu đồ vẽ đường theo `data`, còn tooltip hiển thị `values` thông qua `format`.
- Dòng 142: `.filter(Boolean)` bỏ những cảm biến không có điểm nào.
- Dòng 144–145: 7 nhãn trục x và 25 nhãn dùng làm tiêu đề tooltip.

### Đèn LED (dòng 147–152)

Trạng thái hiển thị của mỗi đèn được ghép từ hai nguồn:

- `confirmedOn`: trạng thái thật do backend báo về.
- `pending[code]`: lệnh vừa gửi mà ESP8266 chưa xác nhận.

Nếu lệnh đang chờ và chưa quá 12 giây, giao diện hiện trạng thái *mong muốn* (`p.on`) kèm biểu tượng loading. Hết thời gian chờ thì quay về trạng thái thật.

---

## 4. Gửi lệnh LED (dòng 154–176)

- **`markPending` / `clearPending` (154–157):** thêm hoặc xoá mục trong state `pending`, có dạng `{ [code]: { on, since } }`.
- **`sendCommand` (159–173):** luồng chung cho mọi lệnh.
  1. Đánh dấu chờ (dòng 160).
  2. Gọi API (dòng 162).
  3. Nếu có kết quả `status === 'FAILED'` (không gửi được qua MQTT), bỏ trạng thái chờ và hiện thông báo lỗi (dòng 163–167).
  4. Nếu API ném lỗi, ví dụ **503** vì ESP8266 chưa kết nối, cũng bỏ trạng thái chờ và hiện lỗi (dòng 168–171).
  5. Cuối cùng gọi `devices.reload()` để lấy trạng thái mới ngay (dòng 172).
- **Dòng 175:** `toggleLed` gọi `POST /api/devices/{code}/control` với `{ action: 'TURN_ON' | 'TURN_OFF' }`.
- **Dòng 176:** `setAll` gọi `POST /api/devices/control-all`.

---

## 5. Giao diện (dòng 178–240)

```
AppShell (sidebar + khung trang)
├─ notificationHolder              dòng 180: nơi antd hiện thông báo lỗi lệnh LED
├─ GreetingHeader                  dòng 181: lời chào + tên người dùng + đồng hồ
├─ Alert lỗi sensors               dòng 183
├─ 3 × MetricCard                  dòng 185–197: cards.map, gộp props từ describeReading
├─ Panel "Telemetry Spectrum"      dòng 199–214
│   ├─ chú thích màu (legend)      dòng 202–211: cards.map
│   └─ TelemetryChart              dòng 213: series, labels, pointLabels, current
└─ Panel "Led Devices"             dòng 216–238
    ├─ nút All On / All Off        dòng 220–227 → setAll
    ├─ Alert lỗi devices           dòng 231
    └─ n × LedDeviceCard           dòng 234–236 → toggleLed
```

---

## Tóm tắt luồng dữ liệu

```
Backend ──(poll 2s)──► sensors ──┐
        ──(1 lần)───► thresholds ┼─► cards ──► MetricCard × 3, legend, ô "Now"
        ──(poll 10s)─► history ──┴─► toSeries × scale ──► series ──► TelemetryChart
        ──(poll 2s / 0,3s)─► devices ─┬─► leds ──► LedDeviceCard
                     state pending ───┘     ▲
                                            │
Người dùng bấm công tắc ─► sendCommand ─► POST control ─► devices.reload()
```

Mọi giá trị trên trang đều được tính lại mỗi lần render, không có state trung gian. Chỉ có hai state thật là `pending`, cùng `now` cập nhật mỗi giây. Vì vậy chỉ cần một lần poll trả dữ liệu mới là giao diện tự cập nhật.
