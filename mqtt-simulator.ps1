# mqtt-simulator.ps1
# Giả lập ESP8266: publish sensor data mỗi 2 giây vào broker MQTT đang chạy trong Docker.
# Dùng khi không có phần cứng để test full pipeline (backend → DB → WebSocket alert).
#
# Chạy: .\mqtt-simulator.ps1
# Dừng: Ctrl+C

$CONTAINER  = "iot-mqtt"
$BROKER     = "127.0.0.1"
$PORT       = 1888
$USER       = "NguyenTruongGiang"
$PASS       = "B23DCCN259"
$TOPIC_SENS = "esp8266/sensor"
$TOPIC_STS  = "esp8266/led/status"

# Xác nhận container đang chạy
$running = docker inspect -f "{{.State.Running}}" $CONTAINER 2>$null
if ($running -ne "true") {
    Write-Host "Container '$CONTAINER' chua chay. Khoi dong bang: docker compose up -d" -ForegroundColor Red
    exit 1
}

function Pub($topic, $payload) {
    # Pipe via stdin (-l) to avoid PowerShell stripping double-quotes in native command args.
    # The backend strips any UTF-8 BOM (﻿) that PowerShell may prepend to the pipe stream.
    $payload | docker exec -i $CONTAINER mosquitto_pub `
        -h $BROKER -p $PORT `
        -u $USER -P $PASS `
        -t $topic -l 2>$null | Out-Null
}

# Trạng thái LED giả — backend sẽ ghi đè qua MQTT command
$ledStatus = '{"led1":"OFF","led2":"OFF","led3":"OFF"}'
Pub $TOPIC_STS $ledStatus
Write-Host "[simulator] Gui trang thai LED ban dau: $ledStatus"

$tick = 0
$PI   = [Math]::PI

Write-Host "[simulator] Bat dau gui du lieu cam bien (Ctrl+C de dung)..." -ForegroundColor Green

while ($true) {
    $tick++

    # --- Cảm biến nhiệt độ: dao động 26–30 °C ---
    $temp  = [Math]::Round(28.0 + 2.0 * [Math]::Sin($tick * 2 * $PI / 30), 1)

    # --- Độ ẩm: dao động 60–75 % ---
    $humi  = [Math]::Round(67.5 + 7.5 * [Math]::Sin($tick * 2 * $PI / 45 + 1.0), 1)

    # --- Ánh sáng LDR raw (0–1024) ---
    $light = [int][Math]::Round(512 + 400 * [Math]::Sin($tick * 2 * $PI / 60 + 2.0))
    $light = [Math]::Max(0, [Math]::Min(1023, $light))

    # --- Gió: thường 100–250, cứ mỗi 10 tick đẩy lên > 300 để trigger cảnh báo ---
    if ($tick % 10 -eq 0) {
        $wind = [Math]::Round(310 + (Get-Random -Minimum 0 -Maximum 80), 1)
        Write-Host "[simulator] WIND SPIKE: $wind (> 300 → trigger WARNING LED)" -ForegroundColor Yellow
    } else {
        $wind = [Math]::Round(100 + 80 * [Math]::Sin($tick * 2 * $PI / 20), 1)
        $wind = [Math]::Max(0, $wind)
    }

    $payload = "{`"temp`":$temp, `"humi`":$humi, `"light`":$light, `"wind`":$wind}"
    Pub $TOPIC_SENS $payload
    Write-Host "[simulator] tick=$tick  $payload"

    Start-Sleep -Seconds 2
}
