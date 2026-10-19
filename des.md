# Mô tả mã nguồn — Hệ thống IoT Giám sát Phòng Lab Nông nghiệp

> Tài liệu này bổ sung cho `IOT-docs.docx` (phân tích thiết kế, use case, ERD, API list).
> Nội dung ở đây tập trung vào **cấu trúc code thực tế**, **phần cứng và sơ đồ chân**, và **luồng kỹ thuật** từng tính năng chính.

---

## 1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  Dashboard / Sensors / History / Profile                    │
│  Polling REST API mỗi 1–2 giây (không dùng WebSocket)       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP REST (JWT)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Spring Boot)                     │
│  REST API  ·  MQTT Client (Paho)  ·  MySQL (JPA/Hibernate)  │
└─────────┬───────────────────────────────────────┬───────────┘
          │ JDBC                                   │ MQTT (tcp://127.0.0.1:1888)
          ▼                                        ▼
   ┌─────────────┐                      ┌──────────────────────┐
   │    MySQL    │                      │   MQTT Broker        │
   │  iot_ptit   │                      │  (Mosquitto / EMQX)  │
   └─────────────┘                      └──────────┬───────────┘
                                                    │ MQTT (Wi-Fi)
                                                    ▼
                                         ┌──────────────────────┐
                                         │  NodeMCU ESP8266     │
                                         │  DHT11 · LDR · LEDs  │
                                         └──────────────────────┘
```

**Điểm quan trọng so với tài liệu thiết kế:**
- Database là **MySQL** (không phải PostgreSQL như bản nháp ban đầu).
- Giao tiếp real-time Frontend ↔ Backend được thực hiện bằng **HTTP polling định kỳ**, không triển khai WebSocket.

---

## 2. Cấu trúc thư mục

```
iot-ptit/
├── backend/                        # Spring Boot 3 + Java 21
│   └── src/main/java/com/iot/backend/
│       ├── config/                 # CorsProperties, JwtProperties, MqttConfig, SecurityConfig, DataInitializer
│       ├── controller/             # REST endpoints
│       ├── dto/                    # Request/Response records
│       ├── entity/                 # JPA entities + enums
│       │   └── enums/              # DeviceAction, DeviceState, DeviceType, SensorType, SensorStatus, ActionStatus
│       ├── mqtt/                   # EspPresence, MqttMessageHandler, MqttPublisher, MqttConnectionManager
│       ├── repository/             # Spring Data JPA repositories
│       ├── service/                # Business logic
│       └── exception/              # GlobalExceptionHandler, DeviceOfflineException, ResourceNotFoundException
│   └── src/main/resources/
│       └── application.yaml        # Cấu hình DB, JWT, MQTT, CORS
│
├── frontend/                       # React + Vite + Ant Design
│   └── src/
│       ├── pages/                  # Dashboard, Sensors, History, Profile, Login
│       ├── components/             # MetricCard, TelemetryChart, LedDeviceCard, DataTable, ...
│       ├── services/               # apiClient, sensorService, deviceService, actionHistoryService, userService, authService
│       ├── hooks/                  # useApi (polling hook), useNow
│       ├── constants/sensors.js    # Cấu hình hiển thị 3 cảm biến (TEMPERATURE, HUMIDITY, LIGHT)
│       └── config.js               # API base URL
│
└── iot-c/
    ├── sketch_sep20a/              # Sketch chính: cảm biến + điều khiển LED qua MQTT
    └── sketch_sep22a/              # Sketch test: nháy lần lượt 3 LED (không dùng MQTT)
```

---

## 3. Phần cứng IoT

### 3.1 Linh kiện sử dụng

| Linh kiện | Vai trò |
|---|---|
| NodeMCU ESP8266 | Vi điều khiển trung tâm, kết nối Wi-Fi, chạy MQTT client |
| DHT11 | Đo nhiệt độ (°C) và độ ẩm không khí (%) |
| LDR (Light Dependent Resistor) | Đo cường độ ánh sáng — trả về giá trị ADC thô 0–1023 |
| LED × 3 | Thiết bị chấp hành, điều khiển qua MQTT |

### 3.2 Sơ đồ chân kết nối (sketch_sep20a — sketch chính)

```
NodeMCU ESP8266
┌────────────────────────────┐
│  D2  (GPIO4)  ──── DHT11 Data        (kèm điện trở pull-up 10kΩ lên 3.3V)
│  A0           ──── LDR (cầu phân áp với điện trở 10kΩ)
│  D5  (GPIO14) ──── LED1 (qua điện trở hạn dòng ~220Ω)
│  D6  (GPIO12) ──── LED2 (qua điện trở hạn dòng ~220Ω)
│  D4  (GPIO2)  ──── LED3 (qua điện trở hạn dòng ~220Ω)
│  3V3          ──── VCC (DHT11, LDR)
│  GND          ──── GND chung
└────────────────────────────┘
```

> **Logic LED — active LOW:** `digitalWrite(Dx, LOW)` = **bật** LED; `digitalWrite(Dx, HIGH)` = **tắt** LED.
> Khi khởi động, ESP8266 set tất cả chân LED về HIGH (tắt hết).

### 3.3 MQTT topics

| Topic | Chiều | Nội dung |
|---|---|---|
| `esp8266/sensor` | ESP8266 → Backend | `{"temp":27.5, "humi":60.0, "light":512}` — gửi mỗi 2 giây |
| `esp8266/led/status` | ESP8266 → Backend | `{"led1":"ON", "led2":"OFF", "led3":"OFF"}` — gửi sau mỗi lệnh |
| `esp8266/command` | Backend → ESP8266 | `LED1_ON`, `LED1_OFF`, `LED2_ON`, `LED2_OFF`, `LED3_ON`, `LED3_OFF`, `ALL_ON`, `ALL_OFF`, `GET_STATUS` |

---

## 4. Luồng kỹ thuật

### 4.1 Thu thập dữ liệu cảm biến

```
ESP8266 (mỗi 2 giây)
  └─ đọc DHT11.readTemperature(), DHT11.readHumidity(), analogRead(A0)
  └─ publish "esp8266/sensor" → {"temp":..., "humi":..., "light":...}
       │
       ▼ MQTT Broker
       │
       ▼ Backend: MqttMessageHandler.messageArrived()
           └─ SensorDataService.saveReadings(payload)
               └─ tra sensors table theo code "temp"/"humi"/"light"
               └─ INSERT vào sensor_data (sensor_id, reading_value, measured_at)
               └─ cập nhật sensors.last_reading_value + sensors.last_reading_at
           └─ EspPresence.seen() — ghi nhận ESP8266 vừa hoạt động
       │
       ▼ Frontend (polling mỗi 2 giây)
           GET /sensors/temp  →  { lastValue, lastReadingAt, status, unit }
           GET /sensors/humi  →  ...
           GET /sensors/light →  ...
           GET /sensors/temp/latest?limit=25  →  { values[], times[] }  (vẽ chart)
```

### 4.2 Điều khiển LED

```
Frontend: người dùng bật LED1
  └─ POST /devices/LED1/control  body: { action: "TURN_ON" }
       │
       ▼ DeviceController.control("LED1", TURN_ON)
           └─ EspPresence.ensureOnline()
               ├─ nếu isOnline() (nghe tin < 5 giây) → tiếp tục ngay
               └─ nếu offline → publish "GET_STATUS", đợi reply tối đa 1 giây
                   ├─ có reply → tiếp tục
                   └─ hết timeout → ném DeviceOfflineException → HTTP 503
           └─ DeviceService.send("LED1", TURN_ON)
               └─ INSERT action_histories { device=LED1, action=TURN_ON, status=PENDING }
               └─ MqttPublisher.publishCommand("LED1_ON")
               └─ trả ActionHistory (PENDING) về Frontend
       │
       ▼ ESP8266 nhận "LED1_ON" trên topic esp8266/command
           └─ digitalWrite(LED1_PIN, LOW)  → bật đèn
           └─ publishLedStatus() → publish "esp8266/led/status"
                                         {"led1":"ON", "led2":"OFF", "led3":"OFF"}
       │
       ▼ Backend: MqttMessageHandler.messageArrived() (topic led/status)
           └─ DeviceService.syncStates({"led1":"ON", ...})
               └─ cập nhật devices.state = ON cho LED1
               └─ tìm action_histories PENDING của LED1 có action=TURN_ON → set SUCCESS
           └─ EspPresence.seen()
       │
       ▼ Frontend (polling mỗi 1 giây)
           GET /devices → trả { code, name, state:"ON", online:true, pendingAction:null, on:true }
```

**Xử lý timeout:** `DeviceService.failTimedOutActions()` chạy mỗi 5 giây — tìm các lệnh PENDING quá 10 giây và chuyển sang FAILED, đồng thời publish `GET_STATUS` để đồng bộ lại trạng thái thật.

### 4.3 Polling từ Frontend

Hook `useApi` (`src/hooks/useApi.js`) thực hiện polling bằng `setInterval`. Các interval đang dùng:

| Dữ liệu | Endpoint | Interval |
|---|---|---|
| 3 thẻ chỉ số (temp/humi/light) | `/sensors/temp`, `/humi`, `/light` | 2000 ms |
| Chart telemetry | `/sensors/temp/latest`, `/humi/latest`, `/light/latest` | 2000 ms |
| Trạng thái LED | `/devices` | 1000 ms |

---

## 5. Các thành phần backend chính

### 5.1 Entities và bảng DB

| Entity | Bảng | Ghi chú |
|---|---|---|
| `User` | `users` | Tài khoản; các trường: username, passwordHash, fullName, email, studentId, role, school, githubUrl, figmaUrl, postmanUrl |
| `Device` | `devices` | LED; trường `state` (enum ON/OFF, không phải boolean) |
| `Sensor` | `sensors` | Cảm biến; có cache `lastValue` + `lastReadingAt` + `status` (ACTIVE/STANDBY/OFFLINE) |
| `SensorData` | `sensor_data` | Chuỗi thời gian số đo; cột `reading_value`, `measured_at`; append-only |
| `ActionHistory` | `action_histories` | Lịch sử lệnh LED; `status`: PENDING → SUCCESS/FAILED |

### 5.2 MQTT layer

| Class | Vai trò |
|---|---|
| `MqttConfig` | Khởi tạo `MqttClient` Paho, subscribe 2 topic, đăng ký `MqttMessageHandler` |
| `MqttConnectionManager` | Tự reconnect khi mất kết nối broker |
| `MqttMessageHandler` | Parse JSON từ ESP8266, gọi `SensorDataService` hoặc `DeviceService` |
| `MqttPublisher` | Gửi lệnh string tới `esp8266/command` |
| `EspPresence` | Theo dõi trạng thái online của ESP8266 qua `lastSeen` timestamp; probe bằng `GET_STATUS` khi cần |

### 5.3 REST Controllers và endpoints thực tế

| Controller | Endpoints |
|---|---|
| `AuthController` | `POST /auth/login` |
| `UserController` | `GET /users/me`, `PUT /users/me` |
| `SensorController` | `GET /sensors`, `GET /sensors/temp`, `GET /sensors/humi`, `GET /sensors/light`, `GET /sensors/temp/latest`, `GET /sensors/humi/latest`, `GET /sensors/light/latest` |
| `SensorDataController` | `GET /sensor-data` (lịch sử số đo, phân trang) |
| `DeviceController` | `GET /devices`, `POST /devices/{code}/control`, `POST /devices/control-all` |
| `ActionHistoryController` | `GET /action-histories` (lịch sử lệnh, phân trang, lọc) |

> Base URL: `http://localhost:8081/api`

---

## 6. Xác nhận so với tài liệu thiết kế (IOT-docs.docx)

Các điểm dưới đây đã được cập nhật trong `IOT-docs.docx` để khớp với code:

| Điểm | Tài liệu (cũ) | Thực tế trong code |
|---|---|---|
| Database | PostgreSQL | **MySQL** |
| Bảng lịch sử thiết bị | `devices_interactions` | **`action_histories`** |
| Bảng số đo cảm biến | `sensor_readings` | **`sensor_data`** |
| Cột thời gian đo | `recorded_at` | **`measured_at`** |
| Cột mã sinh viên | `student_code` | **`student_id`** |
| Cột trạng thái thiết bị | `status BOOLEAN` | **`state VARCHAR(10)`** (enum ON/OFF) |
| Cột sensors | `unit` | **`status`** (ACTIVE/STANDBY/OFFLINE); unit lấy từ `SensorType` enum |
| API Dashboard | `GET /api/dashboard/summary` ... | Không có — Frontend gọi trực tiếp `/sensors/temp` ... |
| API điều khiển LED | `PATCH /devices/{id}/state` | **`POST /devices/{code}/control`** body `{action: TURN_ON/TURN_OFF}` |
| API lịch sử | `GET /devices/history` | **`GET /action-histories`** |
| Real-time | WebSocket (subscribe:sensor, sensor:update, device:status) | **HTTP polling** (không có WebSocket) |
| Profile | GitHub + Figma | Thêm: **email, school, postmanUrl** |
