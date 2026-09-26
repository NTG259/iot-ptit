package com.iot.backend.config;

import com.iot.backend.entity.Device;
import com.iot.backend.entity.Sensor;
import com.iot.backend.entity.User;
import com.iot.backend.entity.enums.DeviceType;
import com.iot.backend.entity.enums.SensorType;
import com.iot.backend.repository.DeviceRepository;
import com.iot.backend.repository.SensorRepository;
import com.iot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

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
        if (deviceRepository.count() == 0) {
            for (int i = 1; i <= 3; i++) {
                Device device = new Device();
                device.setCode("LED" + i);
                device.setName("Led " + i);
                device.setType(DeviceType.SMART_LED);
                deviceRepository.save(device);
            }
        }
        if (sensorRepository.count() == 0) {
            sensorRepository.save(sensor("temp", "Temperature", SensorType.TEMPERATURE));
            sensorRepository.save(sensor("humi", "Humidity", SensorType.HUMIDITY));
            sensorRepository.save(sensor("light", "Light", SensorType.LIGHT));
        }
    }

    private static Sensor sensor(String code, String name, SensorType type) {
        Sensor sensor = new Sensor();
        sensor.setCode(code);
        sensor.setName(name);
        sensor.setType(type);
        return sensor;
    }
}
