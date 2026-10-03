package com.iot.backend.service;

import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.mqtt.EspPresence;
import com.iot.backend.mqtt.MqttPublisher;
import com.iot.backend.repository.ActionHistoryRepository;
import com.iot.backend.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    /** A command with no matching LED status reply within this time is marked FAILED. */
    private static final Duration PENDING_TIMEOUT = Duration.ofSeconds(10);

    private final DeviceRepository deviceRepository;
    private final ActionHistoryRepository actionHistoryRepository;
    private final MqttPublisher mqttPublisher;
    private final EspPresence espPresence;

    public List<Device> findAll() {
        return deviceRepository.findAll(Sort.by("code"));
    }

    /** Sends the action to every device (the dashboard's "All On" / "All Off"); one history row per device. */
    public List<ActionHistory> controlAll(DeviceAction action) {
        espPresence.ensureOnline();
        return findAll().stream().map(device -> send(device.getCode(), action)).toList();
    }

    /**
     * Checks the ESP8266 is reachable first, so an offline board is reported at once (DeviceOfflineException,
     * nothing logged) rather than as a PENDING action that only fails after the timeout.
     */
    public ActionHistory control(String deviceCode, DeviceAction action) {
        espPresence.ensureOnline();
        return send(deviceCode, action);
    }

    /**
     * Logs the action as PENDING, then publishes the command. Intentionally not
     * transactional: the PENDING row must be committed before the ESP8266 replies.
     */
    private ActionHistory send(String deviceCode, DeviceAction action) {
        Device device = deviceRepository.findByCode(deviceCode)
                .orElseThrow(() -> new ResourceNotFoundException("Device", deviceCode));

        ActionHistory history = new ActionHistory();
        history.setDevice(device);
        history.setAction(action);
        history = actionHistoryRepository.save(history);

        try {
            mqttPublisher.publishCommand(device.getCode() + (action == DeviceAction.TURN_ON ? "_ON" : "_OFF"));
        } catch (MqttException e) {
            log.warn("Failed to send {} to {}: {}", action, device.getCode(), e.getMessage());
            history.setStatus(ActionStatus.FAILED);
            history = actionHistoryRepository.save(history);
        }
        return history;
    }

    /** Applies an LED status message; keys are "led1".."led3", values "ON"/"OFF". */
    @Transactional
    public void syncStates(Map<String, String> states) {
        states.forEach((key, value) -> deviceRepository.findByCode(key.toUpperCase()).ifPresentOrElse(
                device -> applyState(device, DeviceState.valueOf(value.toUpperCase())),
                () -> log.warn("Ignoring status for unknown device '{}'", key)));
    }

    private void applyState(Device device, DeviceState state) {
        device.setState(state);
        DeviceAction confirmed = state == DeviceState.ON ? DeviceAction.TURN_ON : DeviceAction.TURN_OFF;
        actionHistoryRepository.findByDeviceAndStatus(device, ActionStatus.PENDING).stream()
                .filter(history -> history.getAction() == confirmed)
                .forEach(history -> history.setStatus(ActionStatus.SUCCESS));
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void failTimedOutActions() {
        Instant cutoff = Instant.now().minus(PENDING_TIMEOUT);
        List<ActionHistory> timedOut = actionHistoryRepository.findByStatusAndCreatedAtBefore(ActionStatus.PENDING, cutoff);
        timedOut.forEach(history -> history.setStatus(ActionStatus.FAILED));
        if (!timedOut.isEmpty()) {
            // The ESP8266 may have switched the LED and only its QoS 0 status reply got lost: ask for the real
            // states again so the stored ones (what the dashboard shows) never stay out of date.
            try {
                mqttPublisher.publishCommand("GET_STATUS");
            } catch (MqttException e) {
                log.warn("Failed to request LED status after timed-out actions: {}", e.getMessage());
            }
        }
    }
}
