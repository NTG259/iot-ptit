package com.iot.backend.service;

import com.iot.backend.dto.AlertMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AlertPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishAlert(AlertMessage message) {
        messagingTemplate.convertAndSend("/topic/alerts", message);
    }
}
