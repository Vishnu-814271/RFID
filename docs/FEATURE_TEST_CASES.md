# AccessTrack Feature Test Cases

This is the end-to-end QA checklist for the current AccessTrack implementation. `Automated` means the repository currently has an executable test. `Manual` means the steps can be executed against a running local or Docker stack. `Not automated` identifies coverage that should be added later.

## Test Environment

- Backend: `http://localhost:8081` locally, or `http://localhost:8085` through Docker Compose.
- Frontend: URL printed by `npm run dev`.
- MQTT: `localhost:1883`.
- Database: H2 for the default local fallback or PostgreSQL through Docker.
- MQTT credentials and device key: use environment-specific values; never copy production secrets into test data.

## 1. Startup and Health

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| SYS-001 | Start backend with JDK 21 | Application starts without bean or migration errors | Automated context test |
| SYS-002 | `GET /api/health` | HTTP 200 and healthy response | Manual, not automated |
| SYS-003 | Start frontend with Vite | Login page renders and assets load | Manual, not automated |
| SYS-004 | Start Docker Compose stack | `db`, `mosquitto`, and `backend` become healthy/reachable | Manual, not automated |
| SYS-005 | Restart backend with existing data | Existing people, cards, mappings, and sessions remain available | Manual, not automated |

## 2. Authentication and Security

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| AUTH-001 | Login with valid active staff credentials | JWT and user profile are returned; dashboard opens | Manual, not automated |
| AUTH-002 | Login with invalid password | Request is rejected; no token is stored | Manual, not automated |
| AUTH-003 | Login with inactive user | Request is rejected | Manual, not automated |
| AUTH-004 | Call protected API without JWT | HTTP 401 | Manual, not automated |
| AUTH-005 | Call protected API with expired/blacklisted JWT | HTTP 401 and frontend returns to login | Manual, not automated |
| AUTH-006 | Read `/api/auth/me` with valid JWT | Current user and role are returned | Manual, not automated |
| AUTH-007 | Change password with correct old password | Password changes and security notification is created | Manual, not automated |
| AUTH-008 | Change password with wrong old password | Request is rejected; password remains unchanged | Manual, not automated |
| AUTH-009 | Request reset for unknown email | Clear rejection message; no reset is issued | Manual, not automated |
| AUTH-010 | First login with temporary password | User is forced to change password | Manual, not automated |

## 3. Role-Based Access Control

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| RBAC-001 | Admin opens staff-user management | Access allowed | Manual, not automated |
| RBAC-002 | Manager opens staff-user management | Access denied/hidden | Manual, not automated |
| RBAC-003 | Operator assigns or releases a card | Operation rejected | Manual, not automated |
| RBAC-004 | Admin or Manager creates a person | Operation succeeds | Manual, not automated |
| RBAC-005 | Operator edits a person | Operation rejected | Manual, not automated |
| RBAC-006 | Admin opens audit logs | Access allowed | Manual, not automated |
| RBAC-007 | Manager or Operator opens restricted audit logs | Access denied/hidden | Manual, not automated |

## 4. People Management

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| PEOPLE-001 | Create an employee with required fields | Person is stored as `EMPLOYEE` and appears in directory | Manual, not automated |
| PEOPLE-002 | Create a student with required fields | Person is stored as `STUDENT` and appears in directory | Manual, not automated |
| PEOPLE-003 | Omit required name/type/group field | Validation error; no partial record | Manual, not automated |
| PEOPLE-004 | Create duplicate external reference | Request is rejected | Manual, not automated |
| PEOPLE-005 | Update name, email, phone, or group | Updated values appear after refresh | Manual, not automated |
| PEOPLE-006 | Change active person to inactive | Person cannot receive access | Manual, not automated |
| PEOPLE-007 | Filter/search people | Results match search and member-type filters | Manual, not automated |
| PEOPLE-008 | Deactivate person with mapped card | Mapping is released according to business rules and lifecycle event is published | Manual, not automated |
| PEOPLE-009 | Check case-insensitive student ID uniqueness | Duplicate IDs are rejected | Existing automated test |

## 5. Card Inventory and Mapping

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| CARD-001 | Register a new card UID | Card enters available inventory | Manual, not automated |
| CARD-002 | Register duplicate card UID | Request is rejected | Manual, not automated |
| CARD-003 | Assign available card to active person | Mapping becomes active and card is assigned | Manual, not automated |
| CARD-004 | Assign card already assigned | Request is rejected | Manual, not automated |
| CARD-005 | Release active mapping | Mapping is released and card becomes available | Manual, not automated |
| CARD-006 | Mark card lost | Card becomes `LOST`; access is denied; notification is created | Manual, not automated |
| CARD-007 | Mark card deactivated | Card becomes `DEACTIVATED`; access is denied | Manual, not automated |
| CARD-008 | View card status filters | All, assigned, and unassigned counts match database state | Manual, not automated |
| CARD-009 | Verify card deletion policy | Historical card/tap data is retained; destructive deletion is unavailable or rejected | Manual, not automated |

## 6. RFID and Attendance Rules

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| ATT-001 | Active mapped card taps check-in reader | `GRANTED`, `CHECK_IN`, open session created | Existing automated test |
| ATT-002 | Active open session taps check-in again | `DENIED`, `ALREADY_CHECKED_IN` | Existing automated coverage in service suite |
| ATT-003 | Active open session taps check-out reader | `GRANTED`, `CHECK_OUT`, session closes | Existing automated coverage |
| ATT-004 | Unknown card taps | `DENIED`, `UNKNOWN_CARD`; event is recorded | Manual, not automated |
| ATT-005 | Unmapped card taps | `DENIED`, `NO_MAPPING` | Manual, not automated |
| ATT-006 | Lost card taps | `DENIED`, `CARD_LOST` | Manual, not automated |
| ATT-007 | Deactivated card taps | `DENIED`, `CARD_DEACTIVATED` | Manual, not automated |
| ATT-008 | Inactive person card taps | `DENIED`, `PERSON_INACTIVE` | Manual, not automated |
| ATT-009 | Tap twice within debounce interval | `DENIED`, `DEBOUNCED` | Manual, not automated |
| ATT-010 | Check out before check in | `DENIED`, `NOT_CHECKED_IN` | Existing automated coverage |
| ATT-011 | Check out earlier than check in | `DENIED`, `INVALID_CHECK_OUT_TIME` | Existing automated test |
| ATT-012 | Check in before previous checkout | `DENIED`, `CHECK_IN_BEFORE_PREVIOUS_CHECKOUT` | Existing automated test |
| ATT-013 | Overnight session attribution disabled | Next-day checkout is denied as not checked in | Existing automated test |
| ATT-014 | Overnight session attribution enabled | Next-day checkout closes prior-day session | Existing automated test |
| ATT-015 | Auto-checkout at configured cutoff | Open sessions become `AUTO_CLOSED` with duration | Existing automated test |
| ATT-016 | Three denied taps in five minutes | One repeated-denial notification is created | Manual, not automated |
| ATT-017 | More than three denied taps | No duplicate threshold notification for the same five-minute window | Manual, not automated |

## 7. MQTT Integration

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| MQTT-001 | Valid camelCase tap payload | Tap is processed and feedback is sent to reader topic | Existing automated test |
| MQTT-002 | Invalid device key | `DENIED` with `INVALID_DEVICE_KEY` is sent to the supplied reader topic | Existing automated test |
| MQTT-003 | Structured lifecycle-style payload with card list | Card UID is extracted and processed | Existing automated test |
| MQTT-004 | Malformed JSON payload | Subscriber does not crash the application | Existing automated test |
| MQTT-005 | Snake_case tap aliases | Backend accepts supported legacy aliases | Manual, not automated |
| MQTT-006 | Missing card UID | Message is rejected without feedback processing | Manual, not automated |
| MQTT-007 | `rfid/cards` lifecycle publish | Payload contains timestamp, event, counts, and `Assigned_card_UID` | Manual, not automated |
| MQTT-008 | Lifecycle response after assignment | Status is `assigned`; counts and active UID list are updated | Manual, not automated |
| MQTT-009 | Lifecycle response after release | Status is `unassigned`; counts and active UID list are updated | Manual, not automated |
| MQTT-010 | Lifecycle response after deactivation/loss | Inactive UID is excluded from `Assigned_card_UID` | Manual, not automated |
| MQTT-011 | Verify removed field | New lifecycle payload does not contain `total_events` | Manual, not automated |
| MQTT-012 | Backend restart initial state | `INITIAL_STATE` is published on startup | Manual, not automated |
| MQTT-013 | Broker unavailable | Backend reconnects according to MQTT client settings and REST app remains diagnosable | Manual, not automated |

## 8. REST APIs and Reports

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| API-001 | List people/cards with valid JWT | HTTP 200 and expected envelope/data | Manual, not automated |
| API-002 | Create/update/release records through APIs | Database and response reflect mutation | Manual, not automated |
| API-003 | Live attendance endpoint | Present/absent lists and counts match sessions | Manual, not automated |
| API-004 | Daily report | Correct totals, late counts, and date | Manual, not automated |
| API-005 | Date-range report | Inclusive range filtering works | Manual, not automated |
| API-006 | Member-type/group filters | Only matching records are returned | Manual, not automated |
| API-007 | Report export | CSV downloads with correct headers and rows | Manual, not automated |
| API-008 | Access logs | Granted/denied events show card, decision, reason, and time | Manual, not automated |
| API-009 | Audit logs | Administrative actions show actor and timestamp | Manual, not automated |
| API-010 | Notification list/read endpoints | Admin/Manager see alerts; marking read updates state | Manual, not automated |
| API-011 | Configuration read/update | Supported system rules change and affect attendance behavior | Manual, not automated |
| API-012 | Purge test data | Authorized admin can clear test records without corrupting schema | Manual, not automated |

## 9. Frontend Screens and Interaction

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| UI-001 | Login success/failure | Correct route and error feedback | Manual, not automated |
| UI-002 | Forced password-change modal | User cannot proceed until password is changed | Manual, not automated |
| UI-003 | Dashboard loads | Analytics, charts, and summary cards render | Manual, not automated |
| UI-004 | Live attendance refresh | New attendance state appears without full reload | Manual, not automated |
| UI-005 | People search/filter/edit | Controls update results and save changes | Manual, not automated |
| UI-006 | Card registration/mapping modal | Valid actions succeed and toast appears | Manual, not automated |
| UI-007 | Reports filters/export | Filtered report downloads successfully | Manual, not automated |
| UI-008 | Notification bell | Unread indicator, list, empty state, and mark-read work | Manual, not automated |
| UI-009 | Role-based navigation | Restricted pages/actions are hidden or rejected | Manual, not automated |
| UI-010 | API 401 response | Token is removed and login page opens | Manual, not automated |
| UI-011 | Mobile layout | Sidebar, tables, modals, and controls remain usable | Manual, not automated |

## 10. ESP32 Hardware

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| HW-001 | ESP32 connects to Wi-Fi | Serial monitor reports connected IP | Manual hardware test |
| HW-002 | ESP32 connects to MQTT with credentials | Broker connection succeeds and subscriptions are visible | Manual hardware test |
| HW-003 | Scan a valid card | Uppercase UID is published to `rfid/taps` | Manual hardware test |
| HW-004 | Scan repeatedly within 2 seconds | Duplicate reads are suppressed | Manual hardware test |
| HW-005 | Receive granted feedback | Green LED and grant tone activate | Manual hardware test |
| HW-006 | Receive denied feedback | Red LED and denial tone activate | Manual hardware test |
| HW-007 | Receive lifecycle event | Serial monitor prints event/status/card details | Manual hardware test |
| HW-008 | Broker disconnect/reconnect | Reader retries and resubscribes | Manual hardware test |
| HW-009 | RC522 wiring validation | Reader initializes on configured SPI pins and 3.3V supply | Manual hardware test |

## 11. Current Automated Test Result

Run from the repository root:

```powershell
./mvnw.cmd test
Set-Location frontend
npm run lint
npm run build
```

Current verified baseline:

- Backend service tests: 9 passed.
- MQTT integration tests: 4 passed after correcting an invalid trailing-comma JSON fixture.
- Frontend production build: passed.
- Frontend lint: passed with warnings for unused imports/variables and Fast Refresh export conventions.
- Frontend automated UI tests: none currently present.
- Hardware tests: manual only.
- REST/controller/security end-to-end tests: recommended next automation area.

## 12. Recommended Automation Order

1. Add MockMvc tests for authentication, RBAC, people, cards, mappings, notifications, and reports.
2. Add unit tests for every `TapService` denial reason and notification threshold.
3. Add a focused `MqttPublisherService` serialization test that asserts the current lifecycle schema and absence of `total_events`.
4. Add React component tests for login, card mapping, notifications, and role-based navigation.
5. Add Playwright smoke tests for login, dashboard, people, cards, reports, and notification workflows.
6. Add broker-backed MQTT tests using a disposable Mosquitto container.
7. Execute the hardware checklist on a real ESP32/RC522 rig.
