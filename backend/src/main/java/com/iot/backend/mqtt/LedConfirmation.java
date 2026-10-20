package com.iot.backend.mqtt;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Cầu nối đồng bộ hoá giữa MQTT thread và HTTP thread đang chờ xác nhận từ ESP8266.
 *
 * <p><b>Vấn đề:</b> Khi frontend bật/tắt đèn, HTTP thread gửi lệnh qua MQTT rồi muốn biết
 * ESP8266 đã thực thi chưa — nhưng phản hồi của ESP lại đến trên một MQTT callback thread
 * hoàn toàn khác. Cần một điểm đồng bộ để HTTP thread block chờ tín hiệu đó.
 *
 * <p><b>Cơ chế:</b>
 * <pre>
 *   HTTP thread                    MQTT callback thread
 *       │                                  │
 *   await() ──► tạo CompletableFuture      │
 *       │       đăng ký vào waiters        │
 *   future.get(N, SECONDS) ── block ────  │  ESP gửi LED status
 *       │                          confirm() ──► complete() tất cả Future
 *       │◄─────────────────────────────────│
 *   tiếp tục xử lý / trả response         │
 * </pre>
 *
 * <p><b>Tại sao CopyOnWriteArrayList:</b> Nhiều request có thể đến cùng lúc (vd bấm "All On")
 * — các HTTP thread gọi {@code await()} đồng thời trong khi MQTT thread gọi {@code confirm()}.
 * CopyOnWriteArrayList an toàn cho tình huống đọc/ghi đồng thời mà không cần synchronized.
 *
 * <p><b>ESP trả trạng thái cả 3 đèn trong một message duy nhất</b>, nên một lần {@code confirm()}
 * đủ để đánh thức mọi HTTP thread đang chờ, kể cả khi toggle từng đèn riêng lẻ.
 */
@Component
public class LedConfirmation {

    // Danh sách Future của các HTTP thread đang block chờ ESP xác nhận.
    private final CopyOnWriteArrayList<CompletableFuture<Void>> waiters = new CopyOnWriteArrayList<>();

    /**
     * Đăng ký một Future mới vào danh sách chờ và trả về cho caller.
     * Caller gọi {@code future.get(N, SECONDS)} để block thread cho đến khi
     * {@link #confirm()} được gọi hoặc hết timeout.
     */
    public CompletableFuture<Void> await() {
        var f = new CompletableFuture<Void>();
        waiters.add(f);
        return f;
    }

    /**
     * Đánh thức tất cả HTTP thread đang chờ — gọi từ MQTT callback sau khi
     * {@code syncStates()} đã cập nhật DB xong, để thread thấy trạng thái mới nhất.
     *
     * <p>Snapshot trước rồi mới clear để tránh race condition: nếu clear trước
     * thì một request mới gọi {@code await()} chen vào giữa sẽ bị mất — Future của nó
     * bị xóa khỏi list mà không bao giờ được complete.
     */
    void confirm() {
        var snapshot = new ArrayList<>(waiters);
        waiters.clear();
        snapshot.forEach(f -> f.complete(null));
    }
}
