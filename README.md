# ==========================================
# 1. CÁC LỆNH LẮNG NGHE (SUB)
# ==========================================

# Lắng nghe dữ liệu cảm biến (Nhiệt độ, độ ẩm, ánh sáng)
mosquitto_sub -h 127.0.0.1 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/sensor"

# Lắng nghe trạng thái LED khi có thay đổi hoặc yêu cầu GET_STATUS
mosquitto_sub -h 127.0.0.1 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/led/status"


# ==========================================
# 2. CÁC LỆNH GỬI ĐIỀU KHIỂN (PUB) -> Gửi vào esp8266/command
# ==========================================

# BẬT / TẮT LED 1
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "LED1_ON"
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "LED1_OFF"

# BẬT / TẮT LED 2
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "LED2_ON"
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "LED2_OFF"

# BẬT / TẮT LED 3
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "LED3_ON"
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "LED3_OFF"

# Bật TẤT CẢ LED
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "ALL_ON"

# Tắt TẤT CẢ LED
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "ALL_OFF"

# Bật/Tắt chế độ đọc cảm biến định kỳ
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "SENSOR_ON"
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "SENSOR_OFF"

# Hỏi trạng thái hiện tại của 3 LED (ESP trả lời trên esp8266/led/status)
mosquitto_pub -h 10.99.105.124 -p 1888 -u "NguyenTruongGiang" -P "B23DCCN259" -t "esp8266/command" -m "GET_STATUS"



sudo mosquitto_passwd -b /etc/mosquitto/passwd NguyenTruongGiang 123456
mosquitto -c /etc/mosquitto/mosquitto.conf -p 1889
sudo systemctl restart mosquitto
sudo systemctl start mosquitto
sudo systemctl stop mosquitto