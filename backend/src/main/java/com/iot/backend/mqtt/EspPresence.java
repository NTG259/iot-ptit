package com.iot.backend.mqtt;

import com.iot.backend.exception.DeviceOfflineException;
import lombok.RequiredArgsConstructor;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Whether the ESP8266 is reachable, so a command can fail at once instead of waiting out the PENDING timeout.
 * Every message it publishes (sensor readings every 2s, LED status replies) counts as a sign of life.
 */
@Component
@RequiredArgsConstructor
public class EspPresence {

    /** Heard from the board this recently: it is online, send the command straight away. */
    private static final Duration RECENT = Duration.ofSeconds(5);
    /**
     * How long to wait for a reply to GET_STATUS. The board answers in well under 200ms on the LAN, and an
     * online board normally never gets here (its 2s sensor readings keep it "recent"), so keep it short.
     */
    private static final Duration PROBE_TIMEOUT = Duration.ofMillis(1000);

    private final MqttPublisher mqttPublisher;

    private volatile Instant lastSeen;
    /** Completed by the next message from the board; shared by concurrent probes. */
    private CompletableFuture<Void> nextMessage = new CompletableFuture<>();

    /** Called for every message from the ESP8266, after it has been handled. */
    public void seen() {
        lastSeen = Instant.now();
        CompletableFuture<Void> waiting;
        synchronized (this) {
            waiting = nextMessage;
            nextMessage = new CompletableFuture<>();
        }
        waiting.complete(null);
    }

    public boolean isOnline() {
        Instant seen = lastSeen;
        return seen != null && seen.isAfter(Instant.now().minus(RECENT));
    }

    /**
     * Returns once the board is known to be online. If it has been quiet, asks for its LED states (which also
     * refreshes the stored ones) and waits briefly for any reply.
     *
     * @throws DeviceOfflineException if the broker is down or the board does not answer in time
     */
    public void ensureOnline() {
        if (isOnline()) {
            return;
        }
        CompletableFuture<Void> reply;
        synchronized (this) {
            reply = nextMessage;
        }
        try {
            mqttPublisher.publishCommand("GET_STATUS");
            reply.get(PROBE_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        } catch (MqttException e) {
            throw new DeviceOfflineException("Cannot reach the MQTT broker. Is it running?");
        } catch (TimeoutException e) {
            throw new DeviceOfflineException("The ESP8266 is not connected. Check its power and Wi-Fi, then try again.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DeviceOfflineException("Interrupted while checking the ESP8266.");
        } catch (ExecutionException e) {
            throw new IllegalStateException(e);
        }
    }
}
