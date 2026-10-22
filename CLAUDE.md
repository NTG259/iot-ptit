# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (Spring Boot + Maven)
```bash
cd backend
./mvnw spring-boot:run        # Run (Windows: mvnw.cmd spring-boot:run)
./mvnw test                   # Run all tests
./mvnw test -Dtest=ClassName  # Run a single test class
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev     # Dev server at http://localhost:5173, proxies /api → backend
npm run lint    # ESLint
npm run build   # Production build to dist/
```

### Infrastructure
```bash
docker compose up -d   # Start Mosquitto MQTT broker on port 1888
```

### Local secrets
Backend reads `backend/.env` (not committed). Override any `application.yaml` placeholder:
```
DB_PASSWORD=...
MQTT_USERNAME=NguyenTruongGiang
MQTT_PASSWORD=...
JWT_SECRET=...
```

---

## Architecture

### Data flow
```
ESP8266 ──MQTT──► Mosquitto :1888 ──► Spring Boot :8081 ──REST/WebSocket──► React :5173
                                           │
                                      MySQL (iot_ptit)
```

- **MQTT topics**: ESP8266 publishes sensor readings to `esp8266/sensor`; Spring Boot subscribes. Backend publishes commands (`LED1_ON`, `ALL_OFF`, `GET_STATUS`, …) to `esp8266/command`; ESP8266 replies on `esp8266/led/status`.
- **WebSocket**: Backend pushes `AlertMessage` objects to `/topic/alerts` via STOMP (Spring WebSocket). Frontend connects with `@stomp/stompjs` in `Dashboard.jsx`.
- **Vite proxy**: In development, Vite forwards both `/api` HTTP and `/api` WebSocket (`ws: true`) to `http://localhost:8081`, so the browser sees a single origin. In production, set `VITE_API_BASE_URL` to point at the backend.

### Backend layers
- `entity/` — JPA entities with `_str` shadow columns (e.g. `measuredAtStr`) for LIKE-based search; base auditing in `BaseEntity`
- `repository/` — Spring Data JPA; search queries use `_str` columns for LIKE and integer enum IDs for equality filters
- `service/` — Business logic; `MqttMessageHandler` parses incoming payloads, updates `Sensor`/`Device` rows, writes `SensorData`, and triggers `AlertPublisher`
- `mqtt/MqttConnectionManager` — Reconnects every 5 s if broker is down; re-subscribes and re-requests LED state on each reconnect
- `config/DataInitializer` — Seeds the three `Sensor` rows (temp/humi/light) and device rows on first boot; idempotent

### Frontend conventions
- **`apiClient.js`** — Thin `fetch` wrapper; backend always returns `{ success, message, data }`, so this layer extracts `data` and throws `ApiError` on failure. Auth token injected automatically; 401 clears session and redirects to `/login`.
- **`useApi` hook** — Wraps async data loading with optional polling (`intervalMs`), preserves last-known data across refreshes so the UI doesn't flash blank. Pass `initialData` to avoid null-checks on first render.
- **Enum filters** — Search APIs accept integer IDs (e.g. `statusIds=1,2`), not string names. The mapping lives in the frontend constants and backend `enums/`.
- **`@/` alias** — Maps to `frontend/src/`; use it for all intra-app imports.
- **Mock mode** — Set `VITE_MOCK=true` to route all API calls through `mockHandlers.js` instead of the real backend.

### Key entities
| Entity | Description |
|--------|-------------|
| `Sensor` | Live reading + metadata for temp/humi/light/wind |
| `SensorData` | Timeseries row written on every MQTT payload |
| `Device` | LED device row; `state` flips ON/OFF via MQTT |
| `ActionHistory` | Log of every control command sent to a device |
| `User` | Single admin user (seeded by `DataInitializer`) |

### OpenAPI / Postman
The spec lives at `docs/openapi.yaml`. A Postman collection and local environment are in `backend/src/docs/postman/`.

---

## ⚠️ Mandatory: Read Before Adding Any New Feature

**`docs/checklist/new-feature-checklist.md` must be read in full before implementing or reviewing any backend feature.**

This checklist is non-negotiable. It documents real bugs that caused data loss and production deadlocks in this codebase (session `2eefe7d`). The four critical rules:

1. **No network I/O inside `@Transactional`** — MQTT publish, HTTP calls inside a transaction cause MySQL lock contention (`Lock wait timeout exceeded`).
2. **Always set `client.setTimeToWait(30_000)`** on any `MqttClient` bean — default `-1` blocks the thread forever.
3. **Never call `client.publish()` from inside `messageArrived()`** — Paho v3 deadlock. Use `CompletableFuture.runAsync()`.
4. **Track `subscribed` state with a separate `volatile boolean`** — `isConnected()` alone is not enough; Paho connects asynchronously after `waitForCompletion()` times out.

Full analysis of why these bugs happened: `docs/intent/concurrency-root-cause.md`
