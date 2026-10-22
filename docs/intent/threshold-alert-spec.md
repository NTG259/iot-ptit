# Threshold Alert Feature — Spec & Task Plan

> Tạo: 2026-10-22 | Branch: dev

---

## Mô tả

Thêm trang cấu hình ngưỡng cho 4 sensor. Khi sensor vượt ngưỡng lần đầu (**edge trigger**), backend gửi lệnh `BLINK` xuống `WARNING_LED` một lần; frontend đổi màu card sensor và hiện toast notification.

---

## Shared Contract (đọc trước khi code bất kỳ task nào)

Tất cả agent phải dùng đúng tên field/endpoint này. Không tự ý đổi.

### ThresholdDto

```json
{
  "sensorCode": "temp",
  "sensorLabel": "Temperature",
  "maxValue": 40.0,
  "enabled": true
}
```

`sensorCode` nhận 1 trong 4 giá trị: `temp` | `humi` | `light` | `wind`

### AlertMessage (shape đã tồn tại, giữ nguyên, chỉ dùng chung cho 4 sensor thay vì chỉ wind)

```json
{
  "sensorCode": "temp",
  "sensorLabel": "Temperature",
  "value": 45.2,
  "threshold": 40.0,
  "time": "2026-10-22T10:30:00"
}
```

### REST endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/thresholds` | Trả về list 4 threshold |
| `PUT` | `/api/thresholds/{sensorCode}` | Cập nhật threshold của 1 sensor |

Request body cho PUT:
```json
{ "maxValue": 40.0, "enabled": true }
```

---

## Data Model

```sql
sensor_threshold (
  id           BIGINT AUTO_INCREMENT PK,
  sensor_code  VARCHAR(20) UNIQUE NOT NULL,
  max_value    DOUBLE NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME,
  updated_at   DATETIME
)
```

Seed mặc định (DataInitializer, idempotent):

| sensorCode | maxValue | enabled |
|------------|----------|---------|
| `temp`     | 40.0     | true    |
| `humi`     | 90.0     | true    |
| `light`    | 800.0    | true    |
| `wind`     | 300.0    | true    |

---

## Edge Trigger Logic (backend)

```
ConcurrentHashMap<String, Boolean> exceeded  // per-sensor exceeded flag, resets on restart

Mỗi lần saveReadings():
  với mỗi sensor đã có threshold:
    if threshold.enabled && value > threshold.maxValue && !exceeded.get(code):
      exceeded.put(code, true)
      CompletableFuture.runAsync(() -> {
          mqttPublisher.publishCommand("BLINK")   // WARNING_LED
          actionHistoryRepository.save(...)
      })
      alertPublisher.publishAlert(sensorCode, value, threshold.maxValue)
    
    if value <= threshold.maxValue:
      exceeded.put(code, false)   // reset để edge trigger lại được lần sau
```

> **Checklist:** `publishCommand()` phải nằm trong `runAsync` — không được gọi trực tiếp từ `saveReadings()`. Xem `docs/checklist/new-feature-checklist.md` rule 3.

---

## Task Breakdown

### T1 — Backend: Threshold Entity + CRUD API
**Agent:** Backend | **Estimate:** 2h | **Depends on:** —

Files cần tạo/sửa:
- `entity/SensorThreshold.java` — extends `BaseEntity`, fields: `sensorCode`, `maxValue`, `enabled`
- `repository/SensorThresholdRepository.java` — `findBySensorCode(String)`
- `service/ThresholdService.java` — `getAll()`, `update(code, dto)`, `getThresholdMap()` (trả `Map<String, SensorThreshold>` để service khác dùng)
- `controller/ThresholdController.java` — `GET /thresholds`, `PUT /thresholds/{sensorCode}`
- `dto/ThresholdDto.java` + `ThresholdUpdateRequest.java`
- `config/DataInitializer.java` — seed 4 default rows nếu chưa có

Done khi: `GET /api/thresholds` trả 4 row, `PUT /api/thresholds/temp` update thành công.

---

### T2 — Backend: Edge Trigger + BLINK
**Agent:** Backend (sau T1) | **Estimate:** 2h | **Depends on:** T1

Files cần sửa:
- `service/SensorDataService.java`:
  - Inject `ThresholdService`
  - Xóa `checkWindThreshold()`, thay bằng `checkThresholds(Map<String, Double> latestValues)`
  - `ConcurrentHashMap<String, Boolean> exceeded` field
  - Gọi `checkThresholds()` sau khi lưu xong tất cả sensor readings
  - `CompletableFuture.runAsync()` bao quanh `publishCommand("BLINK")` + `actionHistoryRepository.save()`
- `service/AlertPublisher.java` — đảm bảo `publishAlert()` nhận `sensorCode` + `sensorLabel` (nếu chưa có)

Done khi: simulator gửi temp > 40 → `action_histories` có row `BLINK`, STOMP `/topic/alerts` nhận message đúng shape.

---

### T3 — Frontend: Threshold Config Page
**Agent:** Frontend A | **Estimate:** 3h | **Depends on:** T1 API contract

Files cần tạo/sửa:
- `services/thresholdService.js` — `getThresholds()`, `updateThreshold(code, data)`
- `pages/ThresholdConfig.jsx` — bảng 4 row, mỗi row: sensor name + maxValue input + enabled toggle + Save button per row
- `pages/ThresholdConfig.css`
- `router/index.jsx` (hoặc tên file router) — thêm route `/thresholds`
- `components/layout/Sidebar.jsx` — thêm menu item "Thresholds"

Mock data để dev trước khi T1 xong (nếu cần):
```js
// mockHandlers.js
'GET /api/thresholds': [
  { sensorCode: 'temp', sensorLabel: 'Temperature', maxValue: 40, enabled: true },
  ...
]
```

Done khi: vào `/thresholds` thấy 4 sensor, sửa maxValue, bấm Save → PUT thành công, reload vẫn đúng.

---

### T4 — Frontend: Dashboard Alert Cards
**Agent:** Frontend B | **Estimate:** 2h | **Depends on:** AlertMessage shape (contract trên)

Files cần sửa:
- `pages/Dashboard.jsx`:
  - Thay `windAlertActive` bằng `Map<sensorCode, boolean>` (state: `alertMap`)
  - STOMP handler: `setAlertMap(prev => ({ ...prev, [alert.sensorCode]: true }))`
  - Auto-reset sau 30s: `setTimeout(() => setAlertMap(prev => ({ ...prev, [alert.sensorCode]: false })), 30000)`
  - Truyền `isAlert={alertMap['temp'] ?? false}` vào từng `<MetricCard>`
- `components/common/MetricCard.jsx` — thêm prop `isAlert`, khi true đổi border/background (màu đỏ nhạt)
- `components/common/MetricCard.css` — thêm variant `.metric-card--alert`

`windAlertActive` (dùng cho status dot) → đổi thành `Object.values(alertMap).some(Boolean)`.

Done khi: gửi mock STOMP message `{ sensorCode: "temp", value: 45, threshold: 40 }` → card Temperature đổi màu đỏ, toast hiện, sau 30s tự reset.

---

## Dependency Graph

```
T1 (Backend entity+API)
  └─► T2 (Edge trigger + BLINK)

T3 (Config page)   ─── có thể dùng mock, không block trên T1
T4 (Dashboard cards) ── chỉ cần contract shape, không cần backend xong
```

## Lịch chạy multi-agent

| Vòng | Agent 1 (Backend) | Agent 2 (Frontend A) | Agent 3 (Frontend B) |
|------|-------------------|----------------------|----------------------|
| 1    | **T1**            | **T3** (mock API)    | **T4**               |
| 2    | **T2**            | integrate T3 với real API | —              |

> T1 + T3 + T4 có thể chạy song song ngay. T2 chỉ cần chờ T1 merge.

---

## Prompt template cho từng agent

### Agent Backend (T1 + T2)

```
Codebase: D:\home\iot-ptit, branch dev.
Đọc docs/intent/threshold-alert-spec.md trước khi code.
Đọc docs/checklist/new-feature-checklist.md — bắt buộc.

Implement T1 trước (entity + CRUD), sau đó T2 (edge trigger + BLINK).
Contract: ThresholdDto và AlertMessage shape đã định nghĩa trong spec.
Không thay đổi shape của AlertMessage hiện tại, chỉ dùng chung cho 4 sensor.
```

### Agent Frontend A (T3)

```
Codebase: D:\home\iot-ptit, branch dev.
Đọc docs/intent/threshold-alert-spec.md — đặc biệt phần Shared Contract.
Implement T3: trang config ngưỡng tại route /thresholds.
Backend API có thể chưa xong — dùng mockHandlers.js nếu cần.
Đọc cách các trang Sensors.jsx / History.jsx được cấu trúc để giữ nhất quán.
```

### Agent Frontend B (T4)

```
Codebase: D:\home\iot-ptit, branch dev.
Đọc docs/intent/threshold-alert-spec.md — đặc biệt phần T4 và AlertMessage shape.
Implement T4: Dashboard alert state cho 4 sensor, đổi màu MetricCard khi có alert.
STOMP WebSocket đã được wire ở Dashboard.jsx — chỉ cần mở rộng handler.
windAlertActive hiện tại dùng cho status dot — phải đổi sang Object.values(alertMap).some(Boolean).
```
