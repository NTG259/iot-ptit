#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"
#include "secrets.h"

const char* ssid        = WIFI_SSID;
const char* password    = WIFI_PASSWORD;

const char* mqtt_server = MQTT_SERVER;
const int   mqtt_port   = 1888;
const char* mqtt_user   = "NguyenTruongGiang";
const char* mqtt_pass   = "B23DCCN259";

const char* topic_pub_sensor = "esp8266/sensor"; 
const char* topic_pub_status = "esp8266/led/status";
const char* topic_sub_cmd    = "esp8266/command";

#define LED1_PIN D5
#define LED2_PIN D6
#define LED3_PIN D4

#define DHTPIN D2      
#define DHTTYPE DHT11  
#define LDR_PIN A0     

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastPubTime = 0;
const unsigned long pubInterval = 2000; 
bool isReadingSensor = true; 

void setupWiFi() {
  delay(10);
  Serial.print("\nDang ket noi WiFi: ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi da ket noi! IP: " + WiFi.localIP().toString());
}

void publishLedStatus() {
  String state1 = (digitalRead(LED1_PIN) == LOW) ? "ON" : "OFF";
  String state2 = (digitalRead(LED2_PIN) == LOW) ? "ON" : "OFF";
  String state3 = (digitalRead(LED3_PIN) == LOW) ? "ON" : "OFF";
  
  char statusPayload[128];
  snprintf(statusPayload, sizeof(statusPayload), 
           "{\"led1\":\"%s\", \"led2\":\"%s\", \"led3\":\"%s\"}", 
           state1.c_str(), state2.c_str(), state3.c_str());

  client.publish(topic_pub_status, statusPayload);
  Serial.println("-> Da gui ban tin Status LED.");
}

void publishSensorData() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int lightVal = analogRead(LDR_PIN);

  if (isnan(h) || isnan(t)) {
    Serial.println("Loi: Khong doc duoc DHT11!");
    return; 
  }

  char sensorPayload[128];
  snprintf(sensorPayload, sizeof(sensorPayload), 
           "{\"temp\":%.1f, \"humi\":%.1f, \"light\":%d}", 
           t, h, lightVal);
  
  client.publish(topic_pub_sensor, sensorPayload);
  Serial.println("-> Da gui ban tin Cam bien.");
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  Serial.printf("Nhan lenh [%s]: %s\n", topic, message.c_str());

  if (String(topic) == topic_sub_cmd) {
    bool ledStateChanged = false;

    if (message == "LED1_OFF")       { digitalWrite(LED1_PIN, HIGH); ledStateChanged = true; }
    else if (message == "LED1_ON")   { digitalWrite(LED1_PIN, LOW);  ledStateChanged = true; }
    else if (message == "LED2_OFF")  { digitalWrite(LED2_PIN, HIGH); ledStateChanged = true; }
    else if (message == "LED2_ON")   { digitalWrite(LED2_PIN, LOW);  ledStateChanged = true; }
    else if (message == "LED3_OFF")  { digitalWrite(LED3_PIN, HIGH); ledStateChanged = true; }
    else if (message == "LED3_ON")   { digitalWrite(LED3_PIN, LOW);  ledStateChanged = true; }
    
    else if (message == "ALL_OFF") {
      digitalWrite(LED1_PIN, HIGH);
      digitalWrite(LED2_PIN, HIGH);
      digitalWrite(LED3_PIN, HIGH);
      ledStateChanged = true;
    }
    else if (message == "ALL_ON") {
      digitalWrite(LED1_PIN, LOW);
      digitalWrite(LED2_PIN, LOW);
      digitalWrite(LED3_PIN, LOW);
      ledStateChanged = true;
    }
    
    else if (message == "SENSOR_ON")  isReadingSensor = true;
    else if (message == "SENSOR_OFF") isReadingSensor = false;

    // Backend hoi trang thai LED (khi no khoi dong / ket noi lai broker)
    else if (message == "GET_STATUS") ledStateChanged = true;

    if (ledStateChanged) {
      publishLedStatus();
    }
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT...");
    String clientId = "ESP8266Client-" + String(random(0xffff), HEX);
    bool ok = (strlen(mqtt_user) > 0) ? 
              client.connect(clientId.c_str(), mqtt_user, mqtt_pass) : 
              client.connect(clientId.c_str());

    if (ok) {
      Serial.println(" Thanh cong!");
      client.subscribe(topic_sub_cmd);
      // Bao trang thai LED ngay khi ket noi, de backend biet ESP vua khoi dong lai (LED ve OFF)
      publishLedStatus();
    } else {
      Serial.printf(" Loi rc=%d. Thu lai sau 3s...\n", client.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  
  dht.begin();
  setupWiFi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(256); 
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) setupWiFi();
  if (!client.connected()) reconnectMQTT();
  client.loop();

  unsigned long now = millis();
  
  if (isReadingSensor && (now - lastPubTime >= pubInterval)) {
    lastPubTime = now;
    publishSensorData();
  }
}