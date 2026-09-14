package com.sentinel.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Consumes {@link AlertEvent} messages from Kafka and broadcasts them to all
 * connected WebSocket clients via STOMP.
 *
 * Subscribers:
 *   /topic/alerts          — receives every new alert (dashboard overview)
 *   /topic/alerts/{siteId} — receives only alerts for a specific site (site detail view)
 *
 * The consumer is tolerant of Kafka being unavailable — if the broker can't be
 * reached on startup, Spring Kafka will retry in the background.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertKafkaConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    @Value("${sentinel.kafka.enabled:false}")
    private boolean kafkaEnabled;

    @KafkaListener(
            topics = KafkaTopics.ALERT_CREATED,
            groupId = "${spring.kafka.consumer.group-id:sentinel-backend}",
            containerFactory = "kafkaListenerContainerFactory",
            autoStartup = "${sentinel.kafka.enabled:false}"
    )
    public void onAlertCreated(AlertEvent event) {
        if (!kafkaEnabled) return;

        log.info("Kafka consumer: received alert {} site={} severity={}",
                event.getAlertId(), event.getSiteId(), event.getSeverity());

        // Broadcast to all subscribers watching the global alerts feed
        messagingTemplate.convertAndSend("/topic/alerts", event);

        // Broadcast to subscribers watching this specific site
        messagingTemplate.convertAndSend("/topic/alerts/" + event.getSiteId(), event);
    }
}
