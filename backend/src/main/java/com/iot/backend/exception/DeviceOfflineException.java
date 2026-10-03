package com.iot.backend.exception;

/** The ESP8266 (or the MQTT broker in front of it) cannot be reached, so a command would never arrive. */
public class DeviceOfflineException extends RuntimeException {

    public DeviceOfflineException(String message) {
        super(message);
    }
}
