# ZenV Quantum | AccessTrack
### Enterprise RFID Access Control & Live Attendance Intelligence Platform

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.0-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-purple.svg)](https://vitejs.dev/)
[![MQTT](https://img.shields.io/badge/MQTT-Mosquitto%20v2-red.svg)](https://mosquitto.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## 📑 Table of Contents
1. [Overview & Vision](#1-overview--vision)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Core Features](#4-core-features)
5. [Database Schema & Migrations](#5-database-schema--migrations)
6. [REST API Documentation](#6-rest-api-documentation)
7. [MQTT IoT & Hardware Integration](#7-mqtt-iot--hardware-integration)
8. [Local Development Setup](#8-local-development-setup)
9. [Docker Deployment](#9-docker-deployment)
10. [Role-Based Access Control (RBAC)](#10-role-based-access-control-rbac)

---

## 1. Overview & Vision

**ZenV Quantum AccessTrack** is an enterprise-grade RFID Access Control and Live Attendance Tracking solution. It bridges physical hardware (ESP32 microcontrollers with RC522 RFID readers) with a real-time reactive Web Application and Spring Boot cloud backend.

Key design philosophies:
- **Instantaneous Real-Time Feedback**: Edge gate readers receive access evaluations in under 50 milliseconds over MQTT.
- **Strict Role Separation**: Personnel categorization into **Employees** and **Students**, managed under customizable Team/Department labels.
- **Live Attendance Intelligence**: Clear separation and metrics for **Today's Presents** and **Today's Absents** with single-click interactive filtering.
- **Enterprise Auditability**: Permanent tracking of card assignments, tap logs, and zero physical card deletions for audit compliance.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph Hardware Layer
        ESP32["ESP32 + RC522 Gate Readers"]
    end

    subgraph Messaging Layer
        Mosquitto["Eclipse Mosquitto MQTT Broker (1883)"]
    end

    subgraph Backend Services
        Spring["Spring Boot 3.5 Application (Port 8081)"]
        Security["Spring Security + JWT Filter"]
        MQTTPub["MQTT Publisher Service"]
        Flyway["Flyway Migration Engine"]
    end

    subgraph Persistence Layer
        DB[("PostgreSQL / H2 Database")]
    end

    subgraph Frontend Web App
        Vite["React 19 Dashboard (Vite, Port 5174)"]
    end

    ESP32 -->|rfid/taps| Mosquitto
    Mosquitto -->|Inbound Tap Event| Spring
    Spring --> Security
    Security --> DB
    Spring -->|rfid/cards/{readerId}| Mosquitto
    Spring -->|rfid/cards/events| Mosquitto
    Mosquitto -->|Gate Access Control| ESP32
    Vite <-->|REST API (Bearer JWT)| Spring
```

---

## 3. Technology Stack

### Backend
- **Framework**: Spring Boot 3.5.0-SNAPSHOT (Java 21)
- **Security**: Spring Security, JWT (JSON Web Tokens) with 24-hour expiration, BCrypt password hashing
- **Messaging**: Spring Integration MQTT, Eclipse Paho Client (`v1.2.5`)
- **Database / ORM**: Spring Data JPA, Hibernate 6, Flyway Migrations
- **Mail Engine**: Spring Boot Starter Mail with TLS / Render auto-detection

### Frontend
- **Framework**: React 19, Vite 8.1
- **Styling**: Vanilla CSS with custom ZenV design tokens (Navy `#102b4d`, Teal `#1e556d`, Green `#10b981`, Red `#ef4444`)
- **Visualizations**: Chart.js & React-Chartjs-2
- **Icons**: Custom SVG ZenV Icons suite

### IoT & Hardware
- **Microcontroller**: ESP32 DevKit V1
- **RFID Scanner**: MFRC522 (SPI interface, 13.56 MHz Mifare)
- **Broker**: Eclipse Mosquitto v2 (Alpine)

---

## 4. Core Features

### 4.1 Live Attendance
- **Today's Headcounts**: Real-time dual metrics displaying **Present Today** (checked in) and **Absent Today** (not checked in).
- **Interactive Filtering**: One-click toggle between `All`, `Present Today`, and `Absent Today`.
- **Status Indicators**: Distinct green `Present` and red `Absent` badges.
- **Session Durations**: Auto-calculated active on-site duration and formatted IST check-in/check-out timestamps.

### 4.2 People Management
- **Member Types**: Categorized strictly into `EMPLOYEE` and `STUDENT`.
- **Team / Group Organization**: Core Platform, Engineering, Design, Finance, HR, Batch 2026-A/B.
- **Assignment Tracking**: Quick badges indicating whether each person has an active card assigned or is `Unassigned`.
- **Full Lifecycle CRUD**: Search, filter, register, edit, and deactivate personnel.

### 4.3 Card Inventory & Mapping
- **Assignment Filters**: Dynamic status counts for `All Cards`, `Assigned`, and `Unassigned`.
- **Card Mapping Flow**: Instant modal to map available cards to unassigned personnel, or unassign cards back to spare stock.
- **Zero-Deletion Policy**: Accidental card deletion is disabled across both frontend and backend to preserve historical tap audit integrity.

### 4.4 Comprehensive Reporting Engine
- **Report Types**: Daily Summary, Date Range Attendance, and Person Drilldown.
- **Filter Controls**: Filter by Date Range, Member Type (`EMPLOYEE`, `STUDENT`), and Team/Department.
- **Export**: One-click CSV and print-ready reporting exports.

### 4.5 Access & Audit Logs
- **Access Logs**: Timestamped raw tap events (`GRANTED`, `DENIED`, `CHECK_IN`, `CHECK_OUT`) with reader location and card UID.
- **Audit Logs**: Administrative actions log (staff logins, card mappings, person creations, status toggles) with actor IP and timestamps.

### 4.6 Staff Users & Password Management
- **Roles**: `ADMIN`, `MANAGER`, `OPERATOR`.
- **Automated Invitations**: Generating secure temporary passwords with branded HTML email notifications dispatched via SMTP.
- **Force Password Reset**: Secure flow requiring users with temporary passwords to reset upon first login.

---

## 5. Database Schema & Migrations

Database schema versioning is managed with **Flyway** under [`src/main/resources/db/migration/V1__init_schema.sql`](src/main/resources/db/migration/V1__init_schema.sql).

### Core Tables

```
people                      --> Personnel directory (person_id, full_name, member_type, external_ref, group_label, status)
staff_users                 --> Admin and portal staff (user_id, email, password, role, active, password_change_required)
rfid_cards                  --> Hardware cards (card_id, card_uid, status)
card_mappings               --> Assignment history (mapping_id, card_id, person_id, status, assigned_at, released_at)
attendance_sessions         --> Daily work/study sessions (session_id, person_id, work_date, check_in_at, check_out_at, duration_minutes)
attendance_events           --> Raw tap log stream (event_id, card_uid, person_id, decision, event_type, reason, occurred_at)
system_configurations       --> Key-value system parameters
notifications               --> In-app notification queue
audit_logs                  --> Enterprise audit trail
```

---

## 6. REST API Documentation

All protected endpoints require the HTTP header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Authentication & Staff
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Authenticate staff user; returns JWT token & user profile |
| `POST` | `/api/auth/reset-password` | Authenticated | Update password when temporary password was issued |
| `GET` | `/api/staff-users` | Admin | List all staff portal users |
| `POST` | `/api/staff-users` | Admin | Create staff user with auto-generated temp password & email invite |

### Live Attendance & Reports
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance/live` | Any Staff | Returns live present & absent headcounts, open sessions, and member lists |
| `GET` | `/api/reports/daily` | Any Staff | Daily attendance summary metrics with late count |
| `GET` | `/api/reports/range` | Any Staff | Range attendance report with date filtering |

### People & Cards
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/people` | Any Staff | Paginated / filtered list of people with active card mappings |
| `POST` | `/api/people` | Admin/Manager | Register new employee or student |
| `PUT` | `/api/people/{id}` | Admin/Manager | Update person details |
| `GET` | `/api/cards` | Any Staff | List all registered cards with assignment status |
| `POST` | `/api/cards` | Admin/Manager | Register a new card UID in spare inventory |
| `POST` | `/api/mapping/assign` | Admin/Manager | Map a card to a person (Broadcasts MQTT `CARD_ASSIGNED`) |
| `POST` | `/api/mapping/release` | Admin/Manager | Unassign card (Broadcasts MQTT `CARD_UNASSIGNED`) |

---

## 7. MQTT IoT & Hardware Integration

For comprehensive hardware pinouts, circuit wiring diagrams, and MQTT message payload formats, refer to the dedicated guide:

👉 **[Dedicated MQTT Protocol & Hardware Documentation (docs/MQTT_DOCUMENTATION.md)](docs/MQTT_DOCUMENTATION.md)**

---

## 8. Local Development Setup

### Prerequisites
- **Java**: JDK 21 (Eclipse Temurin or OpenJDK)
- **Maven**: 3.9+
- **Node.js**: 20+ & npm 10+
- **Mosquitto MQTT Broker** (running on port 1883)

### Step 1: Start Backend (Spring Boot)
```bash
# Set Java 21 environment
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21.0.10"

# Run Spring Boot application
mvn spring-boot:run
```
*Backend runs at `http://localhost:8081`.*

### Step 2: Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5174` (or configured dev port).*

---

## 9. Docker Deployment

### 9.1 Build Docker Image
```bash
docker build -t rftrack:latest .
```

### 9.2 Run Multi-Container Stack (PostgreSQL + Mosquitto + App)
```bash
docker compose up -d
```

### 9.3 Run Standalone Container
```bash
docker run -d \
  -p 8081:8081 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/rfiddb \
  -e SPRING_DATASOURCE_USERNAME=postgres \
  -e SPRING_DATASOURCE_PASSWORD=secret \
  -e MQTT_BROKER_URL=tcp://host.docker.internal:1883 \
  --name rftrack-service \
  rftrack:latest
```

---

## 10. Role-Based Access Control (RBAC)

| Feature / Page | ADMIN | MANAGER | OPERATOR |
| :--- | :---: | :---: | :---: |
| **View Live Attendance & Dashboard** | ✅ | ✅ | ✅ |
| **View People Directory & Cards** | ✅ | ✅ | ✅ |
| **Assign / Unassign RFID Cards** | ✅ | ✅ | ❌ |
| **Create / Edit Personnel** | ✅ | ✅ | ❌ |
| **Export Attendance Reports** | ✅ | ✅ | ❌ |
| **Staff User Management** | ✅ | ❌ | ❌ |
| **System Settings & Configuration** | ✅ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ❌ | ❌ |

---

## 📄 License & Ownership
Copyright © 2026 **ZenCube ZenV Quantum**. All rights reserved.
Developed for enterprise biometric and RFID access intelligence.