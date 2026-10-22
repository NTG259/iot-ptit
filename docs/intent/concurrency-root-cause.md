# Phân tích gốc rễ: Deadlock & Thread Hang

> **Mục tiêu:** Hiểu tại sao từng lỗi xảy ra và rút ra quy tắc cụ thể để không tái tạo khi thêm feature mới.
> Hệ thống: ESP8266 → MQTT → Spring Boot → MySQL → WebSocket → React

---

## Bức tranh chung

Hệ thống có **ba vùng I/O blocking** giao nhau:

```
[MQTT broker]  ←→  [Spring Boot thread pool]  ←→  [MySQL row locks]
                          ↕
                   [WebSocket / STOMP]
```

Tất cả bốn lỗi trong session đều xuất phát từ **một pattern duy nhất**:
> Hai vùng I/O blocking bị gộp vào cùng một ranh giới tài nguyên (transaction, thread, callback).

---

## Lỗi 1 — MySQL Lock Contention

### Triệu chứng
`Lock wait timeout exceeded` trên bảng `sensors` sau ~50 giây. `SensorService.refreshStatuses()` bị block hoàn toàn.

### Chuỗi nguyên nhân
```
saveReadings() [@Transactional]
  └─ sensorDataRepository.save()          ← giữ row lock trên sensors
  └─ sensorRepository.updateStatus()      ← giữ row lock
  └─ mqttPublisher.publishCommand()       ← gọi ra MQTT broker (network I/O, ~ms đến vài giây)
       └─ chờ broker ACK
            └─ trong lúc đó, refreshStatuses() cố UPDATE sensors → chờ lock → timeout 50s
```

### Gốc rễ
**Tầng: Implementation technique.**

`@Transactional` được dùng như một safety blanket mà không tính đến scope. Transaction mở ra, giữ row lock, rồi đi làm network I/O — thứ có latency không kiểm soát được. DB transaction và MQTT I/O nằm trong hai vùng thời gian hoàn toàn khác nhau nhưng bị ép vào cùng một boundary.

Kiến trúc (Spring + MySQL + MQTT) không sai. Sai ở chỗ dùng `@Transactional` sai scope.

### Fix đã áp dụng
- Bỏ `@Transactional` khỏi `saveReadings()`.
- Mỗi `repository.save()` tự commit trong transaction ngắn của riêng nó.
- Dùng native `UPDATE` (`@Modifying @Transactional` trực tiếp trên repository method) thay vì JPA dirty tracking để row lock được giải phóng ngay.

### Quy tắc rút ra
> **Quy tắc 1:** Transaction chỉ bao quanh DB work thuần. Không bao giờ gọi MQTT, HTTP, hay bất kỳ network I/O nào từ bên trong một `@Transactional` method.

---

## Lỗi 2 — Paho `connect()` Block Mãi

### Triệu chứng
Backend khởi động nhưng không bao giờ connect được MQTT. `jstack` thấy thread `MessageBroker-3` stuck trong `Token.waitForResponse()` vô thời hạn.

### Chuỗi nguyên nhân
```
MqttClient (Paho v3) default: timeToWait = -1
  └─ connect() gọi waitForCompletion(timeToWait)
       └─ waitForCompletion(-1) = chờ vô hạn
            └─ nếu broker chậm phản hồi (đang đóng session cũ), thread treo mãi
```

### Gốc rễ
**Tầng: Implementation technique** — không đọc kỹ default của thư viện.

`-1` trong Paho có nghĩa là infinite wait, không phải "dùng timeout mặc định". Đây là convention bất thường (hầu hết thư viện dùng `-1` để bỏ timeout, nhưng thường ở network socket level, không phải application-level blocking call). Lỗi này không phải do kiến trúc — bất kỳ ai dùng Paho v3 mà không set `timeToWait` đều gặp.

### Fix đã áp dụng
```java
client.setTimeToWait(30_000); // trong MqttConfig @Bean
```
30s đủ lâu để Mosquitto đóng session cũ sau `SIGKILL`.

### Quy tắc rút ra
> **Quy tắc 2:** Mọi blocking call ra hệ thống ngoài (thư viện MQTT, HTTP client, socket) phải có timeout tường minh. Không tin vào "default là hợp lý" — luôn kiểm tra javadoc xem default là gì.

---

## Lỗi 3 — Subscription Không Được Đăng Ký Sau Khi Connect Async

### Triệu chứng
Backend log không báo lỗi, broker nhận data từ ESP8266, nhưng `sensor_data` không có row mới nào. Sensor data đến broker nhưng bị drop hoàn toàn.

### Chuỗi nguyên nhân
```
Tick 1: connect() gọi waitForCompletion(30s)
  └─ timeout sau 30s → ném exception → return sớm, KHÔNG subscribe
       └─ ConnectBG thread vẫn chạy ngầm
            └─ vài giây sau: isConnected() = true (async!)

Tick 2: ensureConnected() kiểm tra đầu tiên: if (isConnected()) return  ← BUG
  └─ trả về ngay vì "đã connected"
       └─ subscriptions chưa bao giờ được đăng ký
            └─ Paho gọi messageArrived() cho 0 subscriber → data bị drop
```

### Gốc rễ
**Tầng: Architectural** — mô hình state management không khớp với thư viện async.

Cái sai không phải là một dòng code, mà là một assumption ngầm trong design: *"nếu connect() trả về (kể cả throw), trạng thái subscribed phản ánh đúng thực tế."* Nhưng Paho v3 có thể connect thành công *sau khi* `waitForCompletion()` đã timeout — tức là connection state và subscription state là hai thứ tách biệt, không đồng bộ.

### Fix đã áp dụng
Tách `volatile boolean subscribed` ra khỏi `isConnected()`. Logic trong `ensureConnected()`:
```
if (isConnected() && subscribed) → return (bình thường)
if (isConnected() && !subscribed) → skip reconnect, đi thẳng đến subscribe
if (!isConnected()) → reconnect → subscribe
```

### Quy tắc rút ra
> **Quy tắc 3:** Khi dùng thư viện có async state (connect, handshake, session), không dùng state của thư viện như proxy cho state của application. Track application state (subscribed, authenticated, ready) bằng biến riêng, độc lập.

---

## Lỗi 4 — Paho Callback Thread Deadlock

### Triệu chứng
Mỗi khi wind > 300 m/s, backend treo ~30s, WARNING_LED không bật, log sau đó báo timeout.

### Chuỗi nguyên nhân
```
ESP8266 gửi MQTT message
  └─ Paho: CommsCallback thread gọi messageArrived()
       └─ SensorDataService.checkWindThreshold()
            └─ mqttPublisher.publishCommand("WARNING_LED_ON")
                 └─ client.publish() → waitForCompletion()
                      └─ CommsSender thread cần gửi gói tin
                           └─ CommsSender chờ CommsCallback thread hoàn thành trước khi gửi tiếp
                                └─ DEADLOCK: A chờ B, B chờ A
```

### Gốc rễ
**Tầng: Threading** — vi phạm threading contract của thư viện.

Paho v3 dùng hai thread nội bộ: `CommsCallback` (xử lý incoming messages) và `CommsSender` (gửi outgoing messages). `CommsSender` không gửi gói mới khi `CommsCallback` đang chạy — đây là design của Paho để serialize access. Khi `messageArrived()` cố gọi `publish()`, nó yêu cầu `CommsSender` gửi trong khi `CommsSender` đang chờ `CommsCallback` kết thúc.

Đây là deadlock kinh điển: lock A giữ bởi thread 1, thread 1 cần lock B, lock B giữ bởi thread 2, thread 2 cần lock A.

Không phải lỗi kiến trúc — hoàn toàn hợp lý khi muốn publish một lệnh phản ứng với data nhận được. Chỉ cần làm đúng threading.

### Fix đã áp dụng
```java
// Offload ra khỏi MQTT callback thread
CompletableFuture.runAsync(() -> {
    mqttPublisher.publishCommand(command);
    deviceRepository.save(warningLed);
    actionHistoryRepository.save(history);
});
// WebSocket alert publish synchronously (fast, no I/O blocking với MQTT)
alertPublisher.publishAlert(...);
```

### Quy tắc rút ra
> **Quy tắc 4:** Không bao giờ gọi blocking API của một thư viện từ bên trong callback của chính thư viện đó. Mọi tác vụ nặng (DB write, MQTT publish, HTTP call) trong callback phải được offload sang thread khác.

---

## Tổng kết: Phân loại theo tầng

| Lỗi | Tầng | Pattern |
|-----|------|---------|
| MySQL lock contention | **Implementation technique** | @Transactional sai scope |
| Paho infinite block | **Implementation technique** | Không kiểm tra default thư viện |
| Subscription không đăng ký | **Architecture** | State model không khớp thư viện async |
| Callback deadlock | **Threading** | Blocking call trong callback cùng thư viện |

**Nhận xét:** Hai lỗi là implementation mistakes (có thể tránh bằng code review kỹ hơn). Một lỗi là architectural assumption sai (cần hiểu thư viện trước khi design). Một lỗi là threading constraint của thư viện (cần đọc doc hoặc biết pattern trước).

---

## Các patch hiện tại có đủ không?

**Đủ cho thiết kế hiện tại.** Không có time bomb còn lại với flow hiện tại.

**Rủi ro khi mở rộng:**

| Nếu bạn thêm... | Rủi ro |
|-----------------|--------|
| Service mới có `@Transactional` + gọi MQTT | Tái tạo Lỗi 1 |
| MQTT callback mới xử lý topic mới | Tái tạo Lỗi 4 nếu publish từ trong callback |
| Thư viện mới có async connect (WebSocket client, AMQP) | Tái tạo Lỗi 3 nếu dùng library state làm app state |
| Tăng số lượng sensor/device | An toàn — kiến trúc hiện tại không có bottleneck mới |

---

## Checklist áp dụng khi thêm feature mới

- [ ] Method nào có `@Transactional` không gọi MQTT/HTTP/external I/O bên trong
- [ ] Mọi blocking call ra ngoài đều có timeout tường minh
- [ ] Callback của thư viện (MQTT, WebSocket) không gọi blocking API của chính thư viện đó — dùng `CompletableFuture.runAsync()` nếu cần
- [ ] State của application được track bằng biến riêng, không dựa hoàn toàn vào state của thư viện

---

*Tạo: 2026-10-22 | Session: fix MQTT reliability & MySQL lock contention*
