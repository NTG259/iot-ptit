#include <WiFi.h>
#include <WebServer.h>
#include "DHT.h"

#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define WIFI_CHANNEL  6

#define LED1_PIN 26
#define LED2_PIN 27
#define LED3_PIN 25

#define DHTPIN   15
#define DHTTYPE  DHT22
#define LDR_PIN  34

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

bool led1State = false;
bool led2State = false;
bool led3State = false;

void sendHtml() {
  float temp  = dht.readTemperature();
  float humi  = dht.readHumidity();
  int   light = map(analogRead(LDR_PIN), 0, 4095, 0, 100);

  String response = R"rawhtml(
<!DOCTYPE html><html>
<head>
  <title>ESP32 IoT Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="3">
  <style>
    body { font-family: sans-serif; text-align: center; padding: 1em; }
    h1   { margin-bottom: 1em; }
    .sensors { display: flex; justify-content: center; gap: 1.5em; margin-bottom: 2em; }
    .card { background: #f0f0f0; border-radius: 8px; padding: 1em 1.5em; min-width: 90px; }
    .card h3 { margin: 0 0 .3em; font-size: .85em; color: #555; text-transform: uppercase; }
    .card p  { margin: 0; font-size: 2em; font-weight: bold; }
    .leds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1em; max-width: 380px; margin: auto; }
    .leds h2 { margin: 0; font-size: .95em; }
    .btn { display: block; color: #fff; padding: .5em; font-size: 1.5em;
           text-decoration: none; border-radius: 4px; }
    .on  { background: #4CAF50; }
    .off { background: #555; }
  </style>
</head>
<body>
  <h1>ESP32 IoT Dashboard</h1>
  <div class="sensors">
    <div class="card"><h3>Nhiet do</h3><p>TEMP &deg;C</p></div>
    <div class="card"><h3>Do am</h3><p>HUMI %</p></div>
    <div class="card"><h3>Anh sang</h3><p>LIGHT %</p></div>
  </div>
  <div class="leds">
    <h2>LED 1 (26)</h2><h2>LED 2 (27)</h2><h2>LED 3 (25)</h2>
    <a href="/toggle/1" class="btn CLS1">ST1</a>
    <a href="/toggle/2" class="btn CLS2">ST2</a>
    <a href="/toggle/3" class="btn CLS3">ST3</a>
  </div>
</body>
</html>
)rawhtml";

  response.replace("TEMP",  isnan(temp) ? "--" : String(temp,  1));
  response.replace("HUMI",  isnan(humi) ? "--" : String(humi,  1));
  response.replace("LIGHT", String(light));
  response.replace("ST1",   led1State ? "ON" : "OFF");
  response.replace("ST2",   led2State ? "ON" : "OFF");
  response.replace("ST3",   led3State ? "ON" : "OFF");
  response.replace("CLS1",  led1State ? "on" : "off");
  response.replace("CLS2",  led2State ? "on" : "off");
  response.replace("CLS3",  led3State ? "on" : "off");
  server.send(200, "text/html", response);
}

void setup() {
  Serial.begin(115200);

  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, WIFI_CHANNEL);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println(" Connected! IP: " + WiFi.localIP().toString());

  server.on("/", sendHtml);
  server.on("/toggle/1", []() { led1State = !led1State; digitalWrite(LED1_PIN, led1State); sendHtml(); });
  server.on("/toggle/2", []() { led2State = !led2State; digitalWrite(LED2_PIN, led2State); sendHtml(); });
  server.on("/toggle/3", []() { led3State = !led3State; digitalWrite(LED3_PIN, led3State); sendHtml(); });

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
  delay(2);
}
