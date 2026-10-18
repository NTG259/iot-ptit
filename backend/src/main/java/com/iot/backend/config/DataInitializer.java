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
import java.time.Instant;
import java.util.List;

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
            devices = deviceRepository.findAll();
        }

        List<Sensor> sensors;
        if (sensorRepository.count() == 0) {
            Sensor temp  = sensorRepository.save(sensor("temp",  "Temperature", SensorType.TEMPERATURE));
            Sensor humi  = sensorRepository.save(sensor("humi",  "Humidity",    SensorType.HUMIDITY));
            Sensor light = sensorRepository.save(sensor("light", "Light",       SensorType.LIGHT));
            sensors = List.of(temp, humi, light);
        } else {
            sensors = sensorRepository.findAll();
        }

        if (sensorDataRepository.count() == 0) {
            seedSensorData(sensors);
        }

        if (actionHistoryRepository.count() == 0) {
            seedActionHistory(devices);
        }
    }

    // 120 readings spread over the last 24 hours, one every 12 minutes, cycling through all 3 sensors.
    private void seedSensorData(List<Sensor> sensors) {
        Instant now = Instant.now();
        int total = 120;
        long intervalSeconds = 24 * 3600L / total; // 720 s = 12 min

        Sensor temp  = bySensorType(sensors, SensorType.TEMPERATURE);
        Sensor humi  = bySensorType(sensors, SensorType.HUMIDITY);
        Sensor light = bySensorType(sensors, SensorType.LIGHT);

        for (int i = 0; i < total; i++) {
            Instant t = now.minusSeconds((long) (total - i) * intervalSeconds);
            double phase = (2 * Math.PI * i) / total;

            sensorDataRepository.save(reading(temp,  t, 27.0 + 3.0 * Math.sin(phase)));
            sensorDataRepository.save(reading(humi,  t, 65.0 + 8.0 * Math.sin(phase + 1.0)));
            sensorDataRepository.save(reading(light, t, 500.0 + 200.0 * Math.sin(phase + 2.0)));
        }

        // Update cached last value on each sensor
        Instant lastT = now.minusSeconds(intervalSeconds);
        double lastPhase = (2 * Math.PI * (total - 1)) / total;
        updateSensorCache(temp,  lastT, 27.0 + 3.0 * Math.sin(lastPhase));
        updateSensorCache(humi,  lastT, 65.0 + 8.0 * Math.sin(lastPhase + 1.0));
        updateSensorCache(light, lastT, 500.0 + 200.0 * Math.sin(lastPhase + 2.0));
    }

    private void updateSensorCache(Sensor sensor, Instant at, double value) {
        sensor.setLastValue(round(value, 1));
        sensor.setLastReadingAt(at);
        sensor.setStatus(SensorStatus.ACTIVE);
        sensorRepository.save(sensor);
    }

    // 20 action history entries spread over the last 10 hours (one every 30 min), cycling LEDs.
    // Uses native SQL so @CreationTimestamp doesn't override the backdated timestamps.
    private void seedActionHistory(List<Device> devices) {
        Instant now = Instant.now();
        DeviceAction[] actions = {DeviceAction.TURN_ON, DeviceAction.TURN_OFF};
        ActionStatus[] statuses = {ActionStatus.SUCCESS, ActionStatus.SUCCESS, ActionStatus.SUCCESS, ActionStatus.FAILED};

        for (int i = 0; i < 20; i++) {
            Device device = devices.get(i % devices.size());
            DeviceAction action = actions[i % 2];
            ActionStatus status = statuses[i % statuses.length];
            Timestamp ts = Timestamp.from(now.minusSeconds((long) (20 - i) * 1800));

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

    private static SensorData reading(Sensor sensor, Instant measuredAt, double value) {
        SensorData sd = new SensorData();
        sd.setSensor(sensor);
        sd.setMeasuredAt(measuredAt);
        sd.setValue(round(value, 1));
        return sd;
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    private static Sensor bySensorType(List<Sensor> sensors, SensorType type) {
        return sensors.stream().filter(s -> s.getType() == type).findFirst().orElseThrow();
    }

    private static Sensor sensor(String code, String name, SensorType type) {
        Sensor sensor = new Sensor();
        sensor.setCode(code);
        sensor.setName(name);
        sensor.setType(type);
        return sensor;
    }
}
