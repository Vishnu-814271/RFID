/*
 * ESP32 + RC522 RFID Reader + MQTT Client
 * 
 * Hardware Wiring (SPI):
 * RC522 Pin  ->  ESP32 Pin
 * ------------------------
 * SDA (SS)   ->  GPIO 5
 * SCK        ->  GPIO 18
 * MOSI       ->  GPIO 23
 * MISO       ->  GPIO 19
 * IRQ        ->  Not Connected
 * GND        ->  GND
 * RST        ->  GPIO 22
 * 3.3V       ->  3.3V
 *
 * Status Indicators:
 * Green LED  -> GPIO 2 (Access Granted)
 * Red LED    -> GPIO 4 (Access Denied)
 * Buzzer     -> GPIO 15
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <MFRC522.h>
#include <SPI.h>
#include <ArduinoJson.h>

// --- Configuration ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER = "192.168.1.100"; // Replace with your PC's local IP address
const int   MQTT_PORT   = 1883;
const char* MQTT_USER   = "rfid_user";        // MQTT Username
const char* MQTT_PASS   = "Vishnu@35";       // MQTT Password
const char* DEVICE_KEY  = "RFTSA085E3E85280";
const char* READER_ID   = "GATE_01";

const char* TOPIC_INBOUND_TAPS = "rfid/taps";
String topicFeedback = String("rfid/cards/") + READER_ID;

// Pin Definitions
#define SS_PIN    5
#define RST_PIN   22
#define LED_GREEN 2
#define LED_RED   4
#define BUZZER    15

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Debounce prevent repeated reads
unsigned long lastReadTime = 0;
const unsigned long READ_COOLDOWN_MS = 2000;

void setupWifi() {
  Serial.printf("[WiFi] Connecting to %s...", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.printf("[MQTT Feedback] Received: %s\n", message.c_str());

  // Parse JSON Feedback Response
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.println("[MQTT] JSON parse error");
    return;
  }

  const char* decision = doc["decision"]; // "GRANTED" or "DENIED"
  const char* eventType = doc["eventType"]; // "CHECK_IN", "CHECK_OUT", or null
  const char* reason = doc["reason"];

  if (decision != NULL && strcmp(decision, "GRANTED") == 0) {
    Serial.printf("[ACCESS GRANTED] Event: %s\n", eventType ? eventType : "OK");
    digitalWrite(LED_GREEN, HIGH);
    tone(BUZZER, 2000, 150);
    delay(1000);
    digitalWrite(LED_GREEN, LOW);
  } else {
    Serial.printf("[ACCESS DENIED] Reason: %s\n", reason ? reason : "UNKNOWN");
    digitalWrite(LED_RED, HIGH);
    tone(BUZZER, 800, 400);
    delay(1000);
    digitalWrite(LED_RED, LOW);
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    String clientId = "ESP32_Reader_" + String(READER_ID) + "_" + String(random(0xffff), HEX);
    Serial.printf("[MQTT] Connecting as %s to %s:%d (auth enabled)...", clientId.c_str(), MQTT_BROKER, MQTT_PORT);
    
    // Connect with username & password
    boolean connected = (MQTT_USER != NULL && strlen(MQTT_USER) > 0)
      ? mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)
      : mqttClient.connect(clientId.c_str());

    if (connected) {
      Serial.println(" Connected!");
      mqttClient.subscribe(topicFeedback.c_str());
      Serial.printf("[MQTT] Subscribed to %s\n", topicFeedback.c_str());
    } else {
      Serial.printf(" Failed (rc=%d), retrying in 5 seconds...\n", mqttClient.state());
      delay(5000);
    }
  }
}

void sendCardTap(String cardUid) {
  StaticJsonDocument<256> doc;
  doc["deviceKey"] = DEVICE_KEY;
  doc["readerId"] = READER_ID;
  doc["cardUid"] = cardUid;

  char buffer[256];
  serializeJson(doc, buffer);

  Serial.printf("[MQTT Publish] Sending tap for UID: %s\n", cardUid.c_str());
  mqttClient.publish(TOPIC_INBOUND_TAPS, buffer);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  SPI.begin();
  rfid.PCD_Init();
  Serial.println("[Hardware] RC522 Reader Initialized.");

  setupWifi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Prevent multiple reads in quick succession
  if (millis() - lastReadTime < READ_COOLDOWN_MS) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  lastReadTime = millis();

  // Convert UID bytes to Hex String
  String cardUid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardUid += "0";
    cardUid += String(rfid.uid.uidByte[i], HEX);
  }
  cardUid.toUpperCase();

  Serial.printf("\n[Card Scanned] UID: %s\n", cardUid.c_str());
  sendCardTap(cardUid);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
