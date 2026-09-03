# ZenV Quantum AccessTrack — MQTT Architecture & Protocol Documentation

---

## 1. Executive Summary & Architecture

The **ZenV Quantum AccessTrack** system integrates physical RFID hardware readers with a Spring Boot enterprise backend using **MQTT (Message Queuing Telemetry Transport)**. MQTT is chosen for its ultra-lightweight footprint, low latency, bidirectional publish/subscribe capabilities, and rock-solid reliability across IoT gate controllers and edge devices.

```mermaid
flowchart TD
    subgraph Edge Hardware
        ESP32["ESP32 + RC522 Reader (GATE_01)"]
    end

    subgraph Broker
        Broker["Eclipse Mosquitto Broker (TCP 1883)"]
    end

    subgraph Backend Enterprise
        Spring["Spring Boot Backend (Spring Integration MQTT)"]
        DB[("PostgreSQL / H2 Database")]
    end

    subgraph Web UI
        Vite["React Web Dashboard (Live Attendance)"]
    end

    ESP32 -->|1. Tap Inbound (rfid/taps)| Broker
    Broker -->|2. Receive Tap| Spring
    Spring -->|3. Evaluate & Persist| DB
    Spring -->|4. Decision Feedback (rfid/cards/GATE_01)| Broker
    Broker -->|5. Actuate LEDs & Buzzer| ESP32
    Spring -->|6. Lifecycle Events (rfid/cards/events)| Broker
    Broker -->|7. Card Sync / State Update| ESP32
    Spring -.->|8. Live Attendance & REST| Vite
```

---

## 2. Network & Broker Configuration

| Parameter | Local Docker Development | Cloud / Staging |
| :--- | :--- | :--- |
| **Broker URL** | `tcp://localhost:1883` or `tcp://mosquitto:1883` | `tcp://mqtt.zencube.io:1883` |
| **WebSocket Port** | `9001` | `9001` (WSS 443 via TLS) |
| **Default Username** | `rfid_user` | Configurable via environment variable |
| **Default Password** | `Vishnu@35` | Configurable via environment variable |
| **QoS Level** | `1` (At least once delivery) | `1` |
| **Client IDs** | `rfid-spring-boot-publisher`, `ESP32_RFID_GATE_01` | Unique per hardware gateway |

---

## 3. MQTT Topic Hierarchy

The application establishes a clear, decoupled topic taxonomy:

```
rfid/
├── taps                     <-- INBOUND: Hardware sends card tap requests to Backend
├── cards/
│   ├── {readerId}          <-- OUTBOUND: Backend sends access decision feedback to a specific reader (e.g. GATE_01)
│   └── events               <-- OUTBOUND BROADCAST: Backend broadcasts card mapping, unassignment, & lifecycle updates
└── sync                     <-- BIDIRECTIONAL: Full synchronization of active card whitelist
```

---

## 4. Message Specifications & Payload Formats

### 4.1 Inbound Card Tap (`rfid/taps`)
Published by the ESP32 hardware reader when a physical RFID card or token is scanned.

- **Topic**: `rfid/taps`
- **Direction**: ESP32 Reader ➔ Spring Boot Backend
- **QoS**: `1`

#### Payload Schema:
```json
{
  "card_uid": "CARD_EMP_0102",
  "reader_id": "GATE_01",
  "device_key": "RFTSA085E3E85280",
  "timestamp": 1788440729
}
```

#### Field Definitions:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `card_uid` | `String` | Yes | Unique hardware identifier extracted from the RFID card (e.g. `CARD_EMP_0102` or `04A1B2C3D4`) |
| `reader_id` | `String` | Yes | Physical location or device identifier (e.g. `GATE_01`, `MAIN_ENTRANCE`) |
| `device_key` | `String` | Yes | Security authentication key programmed into the authorized reader |
| `timestamp` | `Long` | Yes | Unix epoch timestamp of the tap event in seconds |

---

### 4.2 Outbound Tap Feedback (`rfid/cards/{readerId}`)
Published by Spring Boot back to the specific reader that originated the tap. The hardware uses this to open access gates, illuminate Green/Red LEDs, and sound the buzzer.

- **Topic**: `rfid/cards/{readerId}` (e.g., `rfid/cards/GATE_01`)
- **Direction**: Spring Boot Backend ➔ Specific ESP32 Reader
- **QoS**: `1`

#### Payload Schema (Access Granted):
```json
{
  "decision": "GRANTED",
  "eventType": "CHECK_IN",
  "personName": "Priya Patel",
  "memberType": "EMPLOYEE",
  "reason": "Successful check-in",
  "timestamp": "2026-09-03 18:35:29"
}
```

#### Payload Schema (Access Denied):
```json
{
  "decision": "DENIED",
  "eventType": "UNKNOWN_CARD",
  "personName": null,
  "memberType": null,
  "reason": "Card is unassigned or inactive",
  "timestamp": "2026-09-03 18:35:30"
}
```

#### Field Definitions:
| Field | Type | Values | Description |
| :--- | :--- | :--- | :--- |
| `decision` | `String` | `GRANTED`, `DENIED` | Final authorization decision |
| `eventType` | `String` | `CHECK_IN`, `CHECK_OUT`, `DENIED`, `UNKNOWN_CARD` | Action taken by the attendance engine |
| `personName` | `String` | Text or `null` | Full name of cardholder if recognized |
| `memberType` | `String` | `EMPLOYEE`, `STUDENT`, or `null` | Categorization of the person |
| `reason` | `String` | Text | Human-readable explanation of the decision |
| `timestamp` | `String` | `yyyy-MM-dd HH:mm:ss` | Time of evaluation in IST format |

---

### 4.3 Card Lifecycle Event Broadcast (`rfid/cards/events`)
Broadcasted to all hardware readers and monitoring microservices whenever an RFID card is assigned to a person, released (unassigned), newly registered, or initialized.

- **Topic**: `rfid/cards/events`
- **Direction**: Spring Boot Backend ➔ All Subscribers
- **QoS**: `1`

#### Standard Lifecycle Payload Structure:
```json
{
  "timestamp": "2026-09-03 18:35:29",
  "timestamp_epoch": 1788440729,
  "event": {
    "event_type": "CARD_ASSIGNED",
    "status": "assigned",
    "card_uid": "CARD_MAP_729",
    "card_id": 323,
    "person_id": 290,
    "person_name": "Test Employee 729",
    "external_ref": "EMP-729",
    "counts": {
      "assigned": 18,
      "unassigned": 9,
      "total_events": 46
    },
    "cards": [
      "CARD_EMP_0101",
      "CARD_EMP_0102",
      "CARD_EMP_0103",
      "CARD_EMP_0104",
      "CARD_STU_0109",
      "CARD_MAP_729"
    ],
    "assigned_cards": [
      "CARD_EMP_0102",
      "CARD_EMP_0103",
      "CARD_EMP_0104",
      "CARD_MAP_729"
    ],
    "unassigned_cards": [
      "CARD_SPARE_01",
      "CARD_SPARE_02"
    ],
    "active_card_counts": {
      "assigned_count": 18,
      "unassigned_count": 9,
      "total_active": 27
    }
  }
}
```

#### Event Types:
| `event_type` | Trigger Condition | Status |
| :--- | :--- | :--- |
| `CARD_ASSIGNED` | Card successfully mapped to an Employee or Student | `"assigned"` |
| `CARD_UNASSIGNED` | Card mapping released/unassigned back to spare inventory | `"unassigned"` |
| `CARD_REGISTERED` | New physical RFID card scanned and registered in inventory | `"unassigned"` |
| `INITIAL_STATE` | Broadcast upon system startup to sync hardware whitelists | `"unassigned"` |

#### Key Payload Modernizations:
1. **Direct String Arrays**: `cards: ["CARD_EMP_0101", ...]` provides zero-overhead card checking for microcontrollers (instead of bloated `[{"card_uid": "..."}]`).
2. **Dual Card Arrays**: Explicit `assigned_cards` and `unassigned_cards` lists allow hardware to update its local offline cache immediately.
3. **Clean Status Naming**: Replaced ambiguous `"status": "available"` with standard `"status": "unassigned"`.
4. **Human Timestamps**: Provides `"yyyy-MM-dd HH:mm:ss"` alongside `"timestamp_epoch"`.
5. **Target Metadata**: Directly includes `card_uid`, `card_id`, `person_id`, `person_name`, and `external_ref`.

---

## 5. Hardware Integration Guide (ESP32 + RC522)

The firmware implementation is provided in [`esp32_rfid_mqtt.ino`](../esp32_rfid_mqtt.ino).

### 5.1 Hardware Pinout & Wiring

| RC522 RFID Module Pin | ESP32 GPIO Pin | Description |
| :--- | :--- | :--- |
| **SDA (SS)** | **GPIO 5** | SPI Chip Select |
| **SCK** | **GPIO 18** | SPI Clock |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In |
| **MISO** | **GPIO 19** | SPI Master In Slave Out |
| **RST** | **GPIO 22** | Hardware Reset |
| **GND** | **GND** | Ground |
| **3.3V** | **3.3V** | **Must be 3.3V** (Do NOT connect to 5V) |

| Peripherals | ESP32 GPIO Pin | Description |
| :--- | :--- | :--- |
| **Green LED** | **GPIO 2** | Access Granted indicator |
| **Red LED** | **GPIO 4** | Access Denied indicator |
| **Buzzer** | **GPIO 15** | Acoustic alert (Single beep for granted, triple beep for denied) |

### 5.2 Required Arduino Libraries
Install the following libraries via the Arduino IDE Library Manager:
- **`PubSubClient`** by Nick O'Leary (Version 2.8+)
- **`MFRC522`** by GithubCommunity (Version 1.4.10+)
- **`ArduinoJson`** by Benoit Blanchon (Version 6.21+)

### 5.3 Hardware Behavior Flow
1. **Startup**: Connects to WiFi, authenticates to Mosquitto MQTT broker, subscribes to:
   - `rfid/cards/GATE_01` (Direct feedback)
   - `rfid/cards/events` (Card lifecycle events)
2. **Card Scan**: RC522 reads 4-byte or 7-byte UID, converts to hex string, applies a 2000ms debounce cooldown, and publishes to `rfid/taps`.
3. **Feedback Processing**:
   - `decision == "GRANTED"`: Illuminates Green LED for 2 seconds, emits a pleasant beep on GPIO 15, prints person name on Serial Monitor.
   - `decision == "DENIED"`: Flashes Red LED 3 times, sounds warning buzzer beeps.

---

## 6. Testing & Simulation Guide

### 6.1 Inspecting MQTT Traffic via Mosquitto CLI

Subscribe to all topics to monitor live system events:
```bash
mosquitto_sub -h localhost -p 1883 -u rfid_user -P Vishnu@35 -t "rfid/#" -v
```

### 6.2 Simulating a Hardware Tap Inbound

Publish a simulated card tap as if an ESP32 gate reader scanned it:
```bash
mosquitto_pub -h localhost -p 1883 -u rfid_user -P Vishnu@35 -t "rfid/taps" \
  -m '{"card_uid":"CARD_EMP_0102","reader_id":"GATE_01","device_key":"RFTSA085E3E85280","timestamp":1788440729}'
```

### 6.3 Automated Python Test Script

```python
import paho.mqtt.client as mqtt
import json
import time

def on_message(client, userdata, msg):
    print(f"\n[RECEIVED] Topic: {msg.topic}")
    print(json.dumps(json.loads(msg.payload.decode()), indent=2))

client = mqtt.Client()
client.username_pw_set("rfid_user", "Vishnu@35")
client.on_message = on_message
client.connect("localhost", 1883, 60)
client.subscribe("rfid/#")
client.loop_start()

# Simulate card tap
tap_payload = {
    "card_uid": "CARD_EMP_0102",
    "reader_id": "GATE_01",
    "device_key": "RFTSA085E3E85280",
    "timestamp": int(time.time())
}
client.publish("rfid/taps", json.dumps(tap_payload))
time.sleep(3)
client.loop_stop()
```
