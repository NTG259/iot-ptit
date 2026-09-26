// ----------------- CHƯƠNG TRÌNH NHÁY LẦN LƯỢT 3 LED (D5, D6, D8) -----------------

#define LED1_PIN D5  // Tương ứng GPIO14
#define LED2_PIN D6  // Tương ứng GPIO12
#define LED3_PIN D8  // Tương ứng GPIO15

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== BAT DAU CHUONG TRINH NHAY LUOT 3 LED (D5, D6, D8) ===");

  // Thiết lập các chân là OUTPUT
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);

  // Tắt toàn bộ LED ban đầu (giả sử LED đấu nối chung cực dương hoặc cực âm tùy mạch, 
  // ở đây dùng mức HIGH để bật và LOW để tắt theo mạch phổ biến)
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
}

void loop() {
  // 1. Bật LED 1 (D5), tắt các LED khác
  Serial.println("Dang sang: LED1 (D5)");
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
  delay(1000); // Giữ sáng 1 giây

  // 2. Bật LED 2 (D6), tắt các LED khác
  Serial.println("Dang sang: LED2 (D6)");
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, LOW);
  delay(1000);

  // 3. Bật LED 3 (D8), tắt các LED khác
  Serial.println("Dang sang: LED3 (D8)");
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, HIGH);
  delay(1000);
}
