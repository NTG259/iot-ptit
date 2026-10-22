# New Feature Checklist

**Bắt buộc đọc và check trước khi implement hoặc review bất kỳ feature mới nào.**
Mỗi mục có lý do — đọc lý do để hiểu khi nào áp dụng, không chỉ tick mù.

---

## 1. Transaction & Database

### ✅ `@Transactional` không bao giờ chứa network I/O

```java
// SAI — transaction giữ row lock trong khi chờ MQTT broker
@Transactional
public void saveAndNotify(Data d) {
    repo.save(d);
    mqttClient.publish(...); // ← network I/O bên trong transaction
}

// ĐÚNG — tách ra
public void saveAndNotify(Data d) {
    repo.save(d);              // auto-commit ngay
    mqttClient.publish(...);   // sau khi lock đã giải phóng
}
```

**Lý do:** MySQL `REPEATABLE_READ` giữ row lock cho đến khi transaction commit. Nếu MQTT broker chậm (network jitter, session handshake), lock bị giữ hàng chục giây. Bất kỳ `UPDATE` nào trên cùng row từ thread khác sẽ `Lock wait timeout exceeded` sau 50s. Đây là lỗi đã xảy ra với `saveReadings()` + `refreshStatuses()` chạy song song.

### ✅ Dùng native `@Modifying @Transactional` trên repository method nếu không có outer transaction

```java
// Nếu caller không có @Transactional, @Modifying sẽ ném:
// "No active transaction for update or delete query"
@Transactional   // ← cần đặt ngay trên method repository
@Modifying
@Query(nativeQuery = true, value = "UPDATE ...")
void updateSomething(...);
```

**Lý do:** `@Modifying` yêu cầu transaction active. Nếu caller đã bỏ `@Transactional` (để tránh lock contention), method repository phải tự khai báo transaction của mình.

---

## 2. MQTT — Paho v3

### ✅ Luôn set `timeToWait` tường minh trên `MqttClient`

```java
client.setTimeToWait(30_000); // milliseconds
```

**Lý do:** Default của Paho v3 là `-1` = chờ vô hạn. `connect()` và `publish()` đều dùng giá trị này. Nếu broker chậm phản hồi (đang đóng session cũ sau kill process), thread bị treo mãi. 30s đủ để Mosquitto timeout session cũ.

### ✅ Không bao giờ gọi `client.publish()` từ bên trong `messageArrived()`

```java
// SAI — deadlock: CommsCallback đang chạy, CommsSender chờ nó xong mới gửi
@Override
public void messageArrived(String topic, MqttMessage msg) {
    processData(msg);
    client.publish("response/topic", ...); // ← DEADLOCK
}

// ĐÚNG — offload sang thread khác
@Override
public void messageArrived(String topic, MqttMessage msg) {
    processData(msg);
    CompletableFuture.runAsync(() -> {
        client.publish("response/topic", ...); // ← chạy ngoài callback thread
    });
}
```

**Lý do:** Paho v3 dùng hai thread nội bộ: `CommsCallback` (incoming) và `CommsSender` (outgoing). `CommsSender` không gửi gói mới khi `CommsCallback` đang chạy — đây là design của Paho để serialize. Gọi `publish()` từ `messageArrived()` tạo circular wait: A chờ B, B chờ A.

**Áp dụng cho mọi tác vụ nặng trong callback:** DB write, HTTP call, logic phức tạp — tất cả nên dùng `CompletableFuture.runAsync()`.

### ✅ Track `subscribed` state bằng biến riêng, không dùng `isConnected()` làm proxy

```java
// SAI — connect() có thể ném timeout nhưng ConnectBG vẫn connect được sau đó
//       isConnected() sẽ = true nhưng subscription chưa được đăng ký
if (!client.isConnected()) { connect(); subscribe(); }

// ĐÚNG — tách hai trạng thái
private volatile boolean subscribed = false;

void ensureConnected() {
    if (client.isConnected() && subscribed) return;
    if (!client.isConnected()) { reconnect(); }
    subscribe();         // luôn subscribe nếu chưa subscribed, dù vừa connect hay connect từ tick trước
    subscribed = true;
}
```

**Lý do:** Paho v3 có thể connect thành công *sau khi* `waitForCompletion()` đã throw timeout — `ConnectBG` thread chạy ngầm. Nếu chỉ check `isConnected()`, tick tiếp theo thấy `true` và return sớm mà không subscribe, khiến mọi MQTT message bị drop silently.

### ✅ Xử lý `REASON_CODE_CONNECT_IN_PROGRESS` (32110) riêng

```java
} catch (MqttException e) {
    if (e.getReasonCode() == MqttException.REASON_CODE_CONNECT_IN_PROGRESS) {
        return; // ConnectBG đang chạy, tick sau sẽ thấy isConnected()=true
    }
    log.warn("Cannot connect: {}", e.getMessage());
}
```

**Lý do:** Khi timeout từ tick trước nhưng `ConnectBG` vẫn đang chạy, tick mới gọi `connect()` lại sẽ nhận code này. Nếu log như lỗi thật, log sẽ spam. Nếu throw, tick bị ngắt sớm.

---

## 3. Threading chung

### ✅ Không trộn blocking I/O từ hai hệ thống khác nhau trên cùng thread

| Tổ hợp nguy hiểm | Vấn đề |
|-----------------|--------|
| DB transaction + MQTT publish | Lock contention (Lỗi 1) |
| MQTT callback + MQTT publish | Deadlock (Lỗi 4) |
| MQTT callback + DB write (nếu chậm) | Callback thread bị block, queue incoming messages |

**Lý do:** Mỗi hệ thống có thread model và latency riêng. Trộn chúng trên cùng thread tạo ra implicit dependency giữa hai hệ thống không liên quan.

### ✅ `volatile` cho shared state giữa `@Scheduled` và callback thread

```java
private volatile boolean subscribed = false;
private volatile boolean callbackRegistered = false;
```

**Lý do:** `@Scheduled` chạy trên Spring thread pool, `messageArrived` chạy trên Paho callback thread. Không có `volatile`, JVM có thể cache giá trị cũ trong CPU register và không thấy update từ thread kia.

---

## 4. Thêm MQTT topic mới

Khi thêm một topic mới (ví dụ `esp8266/new-sensor`):

- [ ] Subscribe trong `MqttConnectionManager.ensureConnected()` — không subscribe một lần rồi thôi, vì reconnect sẽ mất subscription
- [ ] Handler trong `MqttMessageHandler.messageArrived()` không gọi `client.publish()` trực tiếp
- [ ] Nếu cần publish response: dùng `CompletableFuture.runAsync()`
- [ ] Nếu cần ghi DB: không bọc trong `@Transactional` chung với logic MQTT khác

---

## 5. Thêm entity / service mới

Khi thêm entity mới hoặc service mới xử lý dữ liệu từ MQTT:

- [ ] Service method xử lý MQTT data không có `@Transactional` ở top-level
- [ ] Mỗi `repository.save()` / `repository.update()` tự có transaction ngắn của riêng nó
- [ ] Nếu cần update nhiều bảng: xem xét dùng native batch UPDATE thay vì JPA dirty tracking trong một transaction

---

## 6. Thêm thư viện mới có async/connection (WebSocket client, AMQP, Redis...)

- [ ] Đọc javadoc: default timeout của `connect()` là bao nhiêu? (`-1` = vô hạn?)
- [ ] Thư viện có thread riêng cho callback không? Nếu có: không gọi blocking API của nó từ trong callback
- [ ] Connection state của thư viện có đồng bộ không? Nếu async: track app state bằng biến riêng

---

## Nguồn gốc

Checklist này được rút ra từ 4 lỗi thực tế trong session `2eefe7d` (2026-10-22).
Chi tiết phân tích: [`docs/intent/concurrency-root-cause.md`](../intent/concurrency-root-cause.md)
