# Intent: Threshold Redesign

**Date:** 2026-10-30  
**Author:** NTG259

## Statement of Intent

- **Outcome:** Denormalize threshold vào `sensor_data` — mỗi row ghi lại ngưỡng đang có hiệu lực tại thời điểm đó, để query đếm vi phạm chỉ cần `WHERE value > threshold` trên một bảng duy nhất.
- **User:** Developer (query đơn giản hơn) + người dùng xem chart vi phạm theo khoảng thời gian.
- **Why now:** Hiện tại phải join `sensor_data` với bảng threshold history để biết ngưỡng tại thời điểm đó — phức tạp và dễ sai.
- **Success:** Query đếm vi phạm là `SELECT COUNT(*) FROM sensor_data WHERE value > threshold AND measured_at BETWEEN ? AND ?` — không join, không subquery.
- **Constraint:** Mỗi lần MQTT write một `SensorData` row mới, phải snapshot `sensor.threshold` vào `sensor_data.threshold` tại thời điểm đó.
- **Out of scope:** Không thay đổi cơ chế trigger alert realtime (vẫn so sánh reading mới với `sensor.threshold` trực tiếp); không thêm min/max threshold hay threshold theo sensor type riêng.

## Key Design Decisions

- Xóa bảng `threshold` riêng (threshold history table) — toàn bộ được thay thế bằng cột snapshot trong `sensor_data`.
- `sensor.threshold` = ngưỡng hiện tại (single max value).
- `sensor_data.threshold` = snapshot của `sensor.threshold` tại thời điểm row được ghi.
