package com.iot.backend.service;

import com.iot.backend.entity.ActionHistory;
import com.iot.backend.entity.Device;
import com.iot.backend.entity.enums.ActionStatus;
import com.iot.backend.entity.enums.DeviceAction;
import com.iot.backend.entity.enums.DeviceState;
import com.iot.backend.entity.enums.DeviceType;
import com.iot.backend.exception.DeviceOfflineException;
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
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    /** A command with no matching LED status reply within this time is marked FAILED. */
    private static final Duration PENDING_TIMEOUT = Duration.ofSeconds(10);
    private static final DateTimeFormatter VN_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DeviceRepository deviceRepository;
    private final ActionHistoryRepository actionHistoryRepository;
    private final MqttPublisher mqttPublisher;
    private final EspPresence espPresence;

    public List<Device> findAll() {
        return deviceRepository.findAll(Sort.by("code")).stream()
                .filter(d -> d.getType() == DeviceType.SMART_LED)
                .toList();
    }

    public Device findWarningLed() {
        return deviceRepository.findByCode("WARNING_LED")
                .orElseThrow(() -> new ResourceNotFoundException("Device", "WARNING_LED"));
    }

    /**
     * The action the device is still waiting on the ESP8266 to confirm, or null. Only its latest command counts
     * (an older one still PENDING was superseded by a newer click), and only if it would change the LED's state.
     */
    public DeviceAction pendingAction(Device device) {
        DeviceAction current = device.getState() == DeviceState.ON ? DeviceAction.TURN_ON : DeviceAction.TURN_OFF;
        return actionHistoryRepository.findFirstByDeviceOrderByIdDesc(device)
                .filter(history -> history.getStatus() == ActionStatus.PENDING && history.getAction() != current)
                .map(ActionHistory::getAction)
                .orElse(null);
    }

    /**
     * Checks online once, then sends to every device. If the board is offline all three rows are saved as
     * FAILED in one pass (no redundant probes) before the exception propagates.
     */
    public List<ActionHistory> controlAll(DeviceAction action) {
        List<Device> devices = findAll();
        try {
            espPresence.ensureOnline();
        } catch (DeviceOfflineException e) {
            devices.forEach(d -> saveHistory(d, action, ActionStatus.FAILED));
            throw e;
        }
        return devices.stream().map(d -> publish(d, action)).toList();
    }

    public ActionHistory control(String deviceCode, DeviceAction action) {
        return send(deviceCode, action);
    }

    /** Saves PENDING row, checks online, then publishes. Marks FAILED and throws on any error. */
    private ActionHistory send(String deviceCode, DeviceAction action) {
        Device device = deviceRepository.findByCode(deviceCode)
                .orElseThrow(() -> new ResourceNotFoundException("Device", deviceCode));
        ActionHistory history = saveHistory(device, action, ActionStatus.PENDING);
        try {
            espPresence.ensureOnline();
            mqttPublisher.publishCommand(command(device.getCode(), action));
        } catch (DeviceOfflineException e) {
            history.setStatus(ActionStatus.FAILED);
            actionHistoryRepository.save(history);
            throw e;
        } catch (MqttException e) {
            log.warn("Failed to send {} to {}: {}", action, device.getCode(), e.getMessage());
            history.setStatus(ActionStatus.FAILED);
            actionHistoryRepository.save(history);
            throw new DeviceOfflineException("Could not send the command to " + device.getCode() + " — is the MQTT broker running?");
        }
        return history;
    }

    /** Publishes to a device that is already known to be online (used by controlAll). */
    private ActionHistory publish(Device device, DeviceAction action) {
        ActionHistory history = saveHistory(device, action, ActionStatus.PENDING);
        try {
            mqttPublisher.publishCommand(command(device.getCode(), action));
        } catch (MqttException e) {
            log.warn("Failed to send {} to {}: {}", action, device.getCode(), e.getMessage());
            history.setStatus(ActionStatus.FAILED);
            actionHistoryRepository.save(history);
            throw new DeviceOfflineException("Could not send the command to " + device.getCode() + " — is the MQTT broker running?");
        }
        return history;
    }

    private ActionHistory saveHistory(Device device, DeviceAction action, ActionStatus status) {
        ActionHistory h = new ActionHistory();
        h.setDevice(device);
        h.setAction(action);
        h.setStatus(status);
        h.setCreatedAtStr(LocalDateTime.now(ZoneOffset.ofHours(7)).format(VN_FMT));
        return actionHistoryRepository.save(h);
    }

    private static String command(String deviceCode, DeviceAction action) {
        return deviceCode + action.getMqttSuffix();
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
        LocalDateTime cutoff = LocalDateTime.now(ZoneOffset.ofHours(7)).minus(PENDING_TIMEOUT);
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
