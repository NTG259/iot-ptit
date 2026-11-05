package com.iot.backend.config;

import com.iot.backend.entity.Device;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.SensorData;
import com.iot.backend.entity.User;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.DeviceType;
import com.iot.backend.entity.enums.SensorStatus;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.repository.ActionHistoryRepository;
import com.iot.backend.repository.DeviceRepository;
import com.iot.backend.repository.SensorDataRepository;
import com.iot.backend.repository.SensorRepository;
import com.iot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Seeds the devices and sensors the ESP8266 firmware reports on. Codes must match the
 * MQTT payload keys: "LED1".."LED3" for LEDs, "temp"/"humi"/"light" for sensors.
 * Also creates the admin account from app.admin.* when there are no users yet.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final DeviceRepository deviceRepository;
    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final ActionHistoryRepository actionHistoryRepository;
    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminProperties adminProperties;

    @Override
    public void run(String... args) {
        // Ensure all enum columns are VARCHAR(255) so adding new enum values never needs a schema change.
        jdbcTemplate.execute("ALTER TABLE devices MODIFY COLUMN device_type VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE devices MODIFY COLUMN state VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE sensors MODIFY COLUMN sensor_type VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE sensors MODIFY COLUMN status VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE action_histories MODIFY COLUMN action VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE action_histories MODIFY COLUMN status VARCHAR(255)");

        // Migrate wind sensor → CO2 sensor (idempotent: WHERE code='wind' matches nothing after first run).
        jdbcTemplate.execute("UPDATE sensors SET code='co2', name='CO2', sensor_type='CO2', unit='ppm' WHERE code='wind'");

        // Remove WARNING_LED device row — enum value was dropped; must run before any JPA findAll() on devices.
        jdbcTemplate.execute("DELETE FROM action_histories WHERE device_id IN (SELECT id FROM devices WHERE code = 'WARNING_LED')");
        jdbcTemplate.execute("DELETE FROM devices WHERE code = 'WARNING_LED'");

        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setUsername(adminProperties.username());
            admin.setPasswordHash(passwordEncoder.encode(adminProperties.password()));
            admin.setFullName("Nguyễn Trường Giang");
            admin.setStudentId("B23DCCN259");
            admin.setRole("Software Engineering & IoT Student");
            admin.setSchool("Học viện Công nghệ Bưu chính Viễn thông (PTIT)");
            admin.setGithubUrl("https://github.com/NTG259");
            userRepository.save(admin);
        }

        List<Device> devices;
        if (deviceRepository.count() == 0) {
            devices = new java.util.ArrayList<>();
            for (int i = 1; i <= 3; i++) {
                Device device = new Device();
                device.setCode("LED" + i);
                device.setName("Led " + i);
                device.setType(DeviceType.SMART_LED);
                devices.add(deviceRepository.save(device));
            }
        } else {
            devices = deviceRepository.findAll().stream()
                    .filter(d -> d.getType() == DeviceType.SMART_LED)
                    .collect(java.util.stream.Collectors.toList());
        }

        List<Sensor> sensors;
        if (sensorRepository.count() == 0) {
            Sensor temp  = sensorRepository.save(sensor("temp",  "Temperature", SensorType.TEMPERATURE, "°C"));
            Sensor humi  = sensorRepository.save(sensor("humi",  "Humidity",    SensorType.HUMIDITY,    "%"));
            Sensor light = sensorRepository.save(sensor("light", "Light",       SensorType.LIGHT,       "%"));
            Sensor co2   = sensorRepository.save(sensor("co2",   "CO2",         SensorType.CO2,         "ppm"));
            sensors = List.of(temp, humi, light, co2);
        } else {
            sensors = new java.util.ArrayList<>(sensorRepository.findAll());
            if (sensorRepository.findByCode("co2").isEmpty()) {
                sensors.add(sensorRepository.save(sensor("co2", "CO2", SensorType.CO2, "ppm")));
            }
            // Backfill unit column for sensors created before this column was added.
            Map<SensorType, String> defaultUnits = Map.of(
                SensorType.TEMPERATURE, "°C",
                SensorType.HUMIDITY,    "%",
                SensorType.LIGHT,       "%",
                SensorType.CO2,         "ppm"
            );
            sensors.forEach(s -> {
                if (s.getUnit() == null && s.getType() != null) {
                    s.setUnit(defaultUnits.get(s.getType()));
                    sensorRepository.save(s);
                }
            });
        }

        // Must run before seedSensorData() so MQTT snapshots always see a non-zero threshold.
        migrateOrSeedThresholds();

        if (sensorDataRepository.count() == 0) {
            seedSensorData(sensors);
        } else {
            Sensor co2Sensor = sensors.stream()
                    .filter(s -> s.getType() == SensorType.CO2).findFirst().orElse(null);
            if (co2Sensor != null && sensorDataRepository.findLatestBySensorId(co2Sensor.getId(), 1).isEmpty()) {
                seedCO2Data(co2Sensor);
            }
        }

        if (actionHistoryRepository.count() == 0) {
            seedActionHistory(devices);
        }
    }

    /**
     * One-time migration: if sensor_thresholds table exists, backfill sensors.threshold and
     * sensor_data.threshold from historical data, then DROP the table.
     * On subsequent boots (table already gone), ensure any sensor with threshold=0 gets a default.
     */
    private void migrateOrSeedThresholds() {
        boolean tableExists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "SELECT COUNT(*) > 0 FROM information_schema.tables " +
            "WHERE table_schema = DATABASE() AND table_name = 'sensor_thresholds'",
            Boolean.class));

        if (tableExists) {
            // Backfill sensors.threshold from the latest row in sensor_thresholds per sensor_code.
            jdbcTemplate.execute("""
                UPDATE sensors s
                JOIN (
                    SELECT sensor_code, max_value
                    FROM sensor_thresholds
                    WHERE created_at = (
                        SELECT MAX(st2.created_at) FROM sensor_thresholds st2
                        WHERE st2.sensor_code = sensor_thresholds.sensor_code
                    )
                ) latest ON s.code = latest.sensor_code
                SET s.threshold = latest.max_value
                """);

            // Backfill sensor_data.threshold using point-in-time lookup.
            jdbcTemplate.execute("""
                UPDATE sensor_data sd
                JOIN sensors s ON sd.sensor_id = s.id
                JOIN sensor_thresholds st
                  ON st.sensor_code = s.code
                 AND st.created_at = (
                        SELECT MAX(st2.created_at) FROM sensor_thresholds st2
                        WHERE st2.sensor_code = s.code AND st2.created_at <= sd.measured_at
                     )
                SET sd.threshold = st.max_value
                """);

            jdbcTemplate.execute("DROP TABLE sensor_thresholds");
        } else {
            // Seed default threshold for any sensor where threshold = 0.
            Map<String, Double> defaults = Map.of(
                "temp",  40.0,
                "humi",  90.0,
                "light", 90.0,
                "co2",   1000.0
            );
            defaults.forEach((code, max) ->
                jdbcTemplate.update(
                    "UPDATE sensors SET threshold = ? WHERE code = ? AND threshold = 0",
                    max, code));
        }
    }

    private static final DateTimeFormatter VN_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    // 120 readings spread over the last 24 hours, one every 12 minutes, cycling through all 3 sensors.
    private void seedSensorData(List<Sensor> sensors) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        int total = 120;
        long intervalSeconds = 24 * 3600L / total; // 720 s = 12 min

        Sensor temp  = bySensorType(sensors, SensorType.TEMPERATURE);
        Sensor humi  = bySensorType(sensors, SensorType.HUMIDITY);
        Sensor light = bySensorType(sensors, SensorType.LIGHT);

        // Re-read sensors so threshold field is up-to-date after migrateOrSeedThresholds().
        temp  = sensorRepository.findByCode(temp.getCode()).orElse(temp);
        humi  = sensorRepository.findByCode(humi.getCode()).orElse(humi);
        light = sensorRepository.findByCode(light.getCode()).orElse(light);

        for (int i = 0; i < total; i++) {
            LocalDateTime t = now.minusSeconds((long) (total - i) * intervalSeconds);
            double phase = (2 * Math.PI * i) / total;

            sensorDataRepository.save(reading(temp,  t, 27.0 + 3.0 * Math.sin(phase)));
            sensorDataRepository.save(reading(humi,  t, 65.0 + 8.0 * Math.sin(phase + 1.0)));
            sensorDataRepository.save(reading(light, t, 60.0 + 25.0 * Math.sin(phase + 2.0)));
        }

        // Update cached last value on each sensor
        LocalDateTime lastT = now.minusSeconds(intervalSeconds);
        double lastPhase = (2 * Math.PI * (total - 1)) / total;
        updateSensorCache(temp,  lastT, 27.0 + 3.0 * Math.sin(lastPhase));
        updateSensorCache(humi,  lastT, 65.0 + 8.0 * Math.sin(lastPhase + 1.0));
        updateSensorCache(light, lastT, 60.0 + 25.0 * Math.sin(lastPhase + 2.0));

        sensors.stream().filter(s -> s.getType() == SensorType.CO2).findFirst()
                .ifPresent(co2 -> {
                    Sensor co2Fresh = sensorRepository.findByCode(co2.getCode()).orElse(co2);
                    seedCO2Data(co2Fresh);
                });
    }

    // 30 days × 8 readings per day. A few per day exceed 1000 ppm to populate the monthly alert chart.
    private void seedCO2Data(Sensor co2Sensor) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        int days = 30;
        int perDay = 8;
        // CO2 values (ppm): some below and some above 1000 ppm threshold
        double[] dailyValues = { 450, 620, 1200, 380, 1450, 780, 1050, 510 };

        for (int d = days - 1; d >= 0; d--) {
            for (int h = 0; h < perDay; h++) {
                LocalDateTime t = now.minusDays(d).withHour(h * 3).withMinute(0).withSecond(0);
                double base = dailyValues[h];
                double value = round(base + (Math.random() * 80 - 40), 1);
                value = Math.max(300, Math.min(2000, value));
                sensorDataRepository.save(reading(co2Sensor, t, value));
            }
        }
        LocalDateTime lastT = now.withHour(21).withMinute(0).withSecond(0);
        updateSensorCache(co2Sensor, lastT, dailyValues[7]);
    }

    private void updateSensorCache(Sensor sensor, LocalDateTime at, double value) {
        sensor.setLastValue(round(value, 2));
        sensor.setLastReadingAt(at);
        sensor.setStatus(SensorStatus.ACTIVE);
        sensorRepository.save(sensor);
    }

    // 20 action history entries spread over the last 10 hours (one every 30 min), cycling LEDs.
    // Uses native SQL so @CreationTimestamp doesn't override the backdated timestamps.
    private void seedActionHistory(List<Device> devices) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHours(7));
        DeviceAction[] actions = {DeviceAction.TURN_ON, DeviceAction.TURN_OFF};
        ActionStatus[] statuses = {ActionStatus.SUCCESS, ActionStatus.SUCCESS, ActionStatus.SUCCESS, ActionStatus.FAILED};

        for (int i = 0; i < 20; i++) {
            Device device = devices.get(i % devices.size());
            DeviceAction action = actions[i % 2];
            ActionStatus status = statuses[i % statuses.length];
            Timestamp ts = Timestamp.valueOf(now.minusSeconds((long) (20 - i) * 1800));

            jdbcTemplate.update(
                "INSERT INTO action_histories (device_id, action, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                device.getId(), action.name(), status.name(), ts, ts
            );

            // Reflect final state on the device entity
            if (i >= 18) {
                device.setState(action == DeviceAction.TURN_ON ? DeviceState.ON : DeviceState.OFF);
                deviceRepository.save(device);
            }
        }
    }

    private static SensorData reading(Sensor sensor, LocalDateTime measuredAt, double value) {
        SensorData sd = new SensorData();
        sd.setSensor(sensor);
        sd.setMeasuredAt(measuredAt);
        sd.setMeasuredAtStr(measuredAt.format(VN_FMT));
        sd.setValue(round(value, 2));
        sd.setThreshold(sensor.getThreshold());
        return sd;
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    private static Sensor bySensorType(List<Sensor> sensors, SensorType type) {
        return sensors.stream().filter(s -> s.getType() == type).findFirst().orElseThrow();
    }

    private static Sensor sensor(String code, String name, SensorType type, String unit) {
        Sensor s = new Sensor();
        s.setCode(code);
        s.setName(name);
        s.setType(type);
        s.setUnit(unit);
        return s;
    }
}
