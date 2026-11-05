# Spec: Threshold Redesign — Denormalize into sensor_data

**Status:** Pending approval  
**Date:** 2026-10-30  
**Intent:** `docs/intent/threshold-redesign.md`

---

## Objective

Denormalize the active threshold value into each `sensor_data` row at write time, so that counting alert violations is a single-table query with no joins. Delete the separate `sensor_thresholds` history table entirely.

**Before:**
```sql
SELECT COUNT(*) FROM sensor_data sd
JOIN sensors s ON sd.sensor_id = s.id
JOIN sensor_thresholds st ON st.sensor_code = s.code
  AND st.created_at = (
    SELECT MAX(st2.created_at) FROM sensor_thresholds st2
    WHERE st2.sensor_code = s.code AND st2.created_at <= sd.measured_at
  )
WHERE sd.reading_value > st.max_value AND st.enabled = 1
  AND sd.measured_at >= :startDate
```

**After:**
```sql
SELECT COUNT(*) FROM sensor_data
WHERE reading_value > threshold AND measured_at >= :startDate
```

---

## Tech Stack

- Spring Boot 3 / Java 21, Maven
- MySQL (iot_ptit), `ddl-auto: update` — Hibernate auto-adds columns, does NOT drop tables
- JPA + native queries; no Flyway/Liquibase
- Lombok, Spring Data JPA

---

## Commands

```
Build:  cd backend && mvnw.cmd package -DskipTests
Run:    cd backend && mvnw.cmd spring-boot:run
Test:   cd backend && mvnw.cmd test
```

---

## Schema Changes

### `sensors` table — add column
```sql
ALTER TABLE sensors ADD COLUMN threshold DOUBLE NOT NULL DEFAULT 0;
```
Handled by `ddl-auto: update` when `Sensor.java` gets the new field.

### `sensor_data` table — add column
```sql
ALTER TABLE sensor_data ADD COLUMN threshold DOUBLE NOT NULL DEFAULT 0;
```
Handled by `ddl-auto: update` when `SensorData.java` gets the new field.

### `sensor_thresholds` table — DROP (one-time migration in DataInitializer)
```sql
DROP TABLE IF EXISTS sensor_thresholds;
```
Must run AFTER backfilling both new columns from the old table.

---

## Write Flow (MQTT path)

Current `SensorDataService.saveReading(Sensor sensor, Double value, LocalDateTime measuredAt)`:
1. Builds a `SensorData` row.
2. Saves it.
3. Updates `sensor.lastValue` / `sensor.lastReadingAt` via native UPDATE.

New step (between 1 and 2): set `data.setThreshold(sensor.getThreshold())`.  
`sensor` is already in memory at this point — no extra DB call needed.

---

## Migration Strategy (DataInitializer)

Because `ddl-auto: update` won't drop `sensor_thresholds`, `DataInitializer.run()` must perform a one-time migration:

```
IF table sensor_thresholds EXISTS:
  1. Backfill sensors.threshold from the latest row in sensor_thresholds per sensor_code:
       UPDATE sensors s
       JOIN (SELECT sensor_code, max_value FROM sensor_thresholds
             WHERE created_at = (SELECT MAX(created_at) FROM sensor_thresholds st2
                                 WHERE st2.sensor_code = sensor_thresholds.sensor_code)
            ) latest ON s.code = latest.sensor_code
       SET s.threshold = latest.max_value;

  2. Backfill sensor_data.threshold using point-in-time lookup (same correlated query, run once):
       UPDATE sensor_data sd
       JOIN sensors s ON sd.sensor_id = s.id
       JOIN sensor_thresholds st ON st.sensor_code = s.code
         AND st.created_at = (SELECT MAX(st2.created_at) FROM sensor_thresholds st2
                               WHERE st2.sensor_code = s.code AND st2.created_at <= sd.measured_at)
       SET sd.threshold = st.max_value;

  3. DROP TABLE sensor_thresholds;

IF table sensor_thresholds does NOT exist (migration already ran):
  Ensure sensors.threshold is seeded for any sensor where threshold = 0:
    temp → 40.0, humi → 90.0, light → 90.0, co2 → 1000.0
```

---

## Code Changes

| File | Change |
|------|--------|
| `entity/Sensor.java` | Add `private double threshold;` |
| `entity/SensorData.java` | Add `private double threshold;` |
| `entity/SensorThreshold.java` | **DELETE** |
| `repository/SensorThresholdRepository.java` | **DELETE** |
| `service/ThresholdService.java` | Rewrite: read/write `sensor.threshold` via `SensorRepository`; remove `enabled` |
| `service/SensorDataService.java` | `saveReading()`: set `data.setThreshold(sensor.getThreshold())`; simplify `findAlertsByDayAndSensor` query |
| `repository/SensorDataRepository.java` | Replace `findAlertsByDayAndSensor` with single-table query |
| `config/DataInitializer.java` | Replace `seedThresholds()` + `SensorThresholdRepository` with migration logic above |
| `dto/ThresholdDto.java` | Drop `enabled` field → `record ThresholdDto(String sensorCode, String sensorLabel, double maxValue)` |
| `dto/ThresholdUpdateRequest.java` | Drop `enabled` field → `record ThresholdUpdateRequest(double maxValue)` |
| `controller/ThresholdController.java` | No change (same REST contract) |

---

## API Contract

`GET /api/thresholds` — returns current threshold per sensor (reads from `sensors` table):
```json
[
  { "sensorCode": "temp",  "sensorLabel": "Temperature", "maxValue": 40.0 },
  { "sensorCode": "humi",  "sensorLabel": "Humidity",    "maxValue": 90.0 },
  { "sensorCode": "light", "sensorLabel": "Light",       "maxValue": 90.0 },
  { "sensorCode": "co2",   "sensorLabel": "CO2",         "maxValue": 1000.0 }
]
```

`PUT /api/thresholds/{sensorCode}` — updates `sensor.threshold` directly:
```json
{ "maxValue": 35.0 }
```

**Breaking change:** `enabled` field removed from both request and response.

---

## Success Criteria

1. `sensor_thresholds` table no longer exists after first boot on the new code.
2. `sensors.threshold` holds the current active max value for each sensor.
3. `sensor_data.threshold` holds the threshold value snapshotted at write time for every row (including backfilled historical rows).
4. `getMonthlyAlerts()` returns the same alert counts as before for data that existed pre-migration.
5. New MQTT readings written after migration have `sensor_data.threshold` set to the sensor's current threshold.
6. `PUT /api/thresholds/{code}` updates `sensor.threshold` in place (no history insert).
7. Application starts cleanly (no Spring errors) after migration.

---

## Boundaries

- **Always:** Keep `sensor.threshold` as a flat field on `Sensor` — no separate threshold entity.
- **Ask first:** Any change to the alert count semantics (e.g., adding a `>=` vs `>` distinction).
- **Never:** Re-introduce a threshold history table; that complexity is what we're removing.

---

## Decisions (Open Questions Resolved)

1. **Backfill timeout:** Accept the startup delay — this is a dev/prototype, table will never have millions of rows. No batching needed.
2. **Seed order in DataInitializer:** Seed `sensor.threshold` immediately after creating sensors, **before** calling `seedSensorData()`. This ensures any MQTT message arriving during seed always snapshots a non-zero threshold.
