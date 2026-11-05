# Tasks: Threshold Redesign

Spec: `docs/SPEC-threshold-redesign.md`

---

- [x] **T1 — Cập nhật entity**
  - Acceptance: `Sensor.java` có field `private double threshold;`; `SensorData.java` có field `private double threshold;`
  - Verify: `mvnw.cmd compile` không lỗi
  - Files: `entity/Sensor.java`, `entity/SensorData.java`

- [x] **T2 — Đơn giản hóa DTO và xóa enabled**
  - Acceptance: `ThresholdDto` → `record ThresholdDto(String sensorCode, String sensorLabel, double maxValue)`; `ThresholdUpdateRequest` → `record ThresholdUpdateRequest(double maxValue)`
  - Verify: `mvnw.cmd compile` không lỗi
  - Files: `dto/ThresholdDto.java`, `dto/ThresholdUpdateRequest.java`

- [x] **T3 — Viết lại ThresholdService**
  - Acceptance: `getAll()` đọc `threshold` từ `sensors` table qua `SensorRepository`; `update()` ghi thẳng vào `sensor.threshold` bằng native UPDATE; không còn phụ thuộc `SensorThresholdRepository`
  - Verify: `mvnw.cmd compile` không lỗi
  - Files: `service/ThresholdService.java`, `repository/SensorRepository.java` (thêm `updateThreshold` native query)

- [x] **T4 — Snapshot threshold trong saveReading()**
  - Acceptance: `SensorDataService.saveReading()` gọi `data.setThreshold(sensor.getThreshold())` trước khi save
  - Verify: `mvnw.cmd compile` không lỗi
  - Files: `service/SensorDataService.java`

- [x] **T5 — Đơn giản hóa query đếm alert**
  - Acceptance: `SensorDataRepository.findAlertsByDayAndSensor()` dùng `WHERE sd.reading_value > sd.threshold` — không còn JOIN `sensor_thresholds`
  - Verify: `mvnw.cmd compile` không lỗi
  - Files: `repository/SensorDataRepository.java`

- [x] **T6 — Migration trong DataInitializer**
  - Acceptance:
    1. Nếu bảng `sensor_thresholds` tồn tại: backfill `sensors.threshold` + `sensor_data.threshold` rồi DROP TABLE
    2. Nếu không tồn tại: seed default threshold cho sensor nào có `threshold = 0`
    3. Seed threshold chạy **trước** `seedSensorData()`
    4. Xóa dependency `SensorThresholdRepository` khỏi `DataInitializer`
  - Verify: app khởi động sạch, `sensor_thresholds` không còn tồn tại sau boot
  - Files: `config/DataInitializer.java`

- [x] **T7 — Xóa SensorThreshold entity và repository**
  - Acceptance: `SensorThreshold.java` và `SensorThresholdRepository.java` đã xóa; không còn file nào import chúng
  - Verify: `mvnw.cmd compile` không lỗi; `grep -r SensorThreshold src/` trả về rỗng
  - Files: `entity/SensorThreshold.java` (DELETE), `repository/SensorThresholdRepository.java` (DELETE)

- [x] **T8 — Smoke test end-to-end**
  - Acceptance: app khởi động, `GET /api/thresholds` trả về 4 sensors với `maxValue` đúng, `PUT /api/thresholds/temp` với `{"maxValue":35.0}` cập nhật thành công, chart alert load không lỗi
  - Verify: `mvnw.cmd spring-boot:run` + manual API calls
  - Files: (không sửa code)
