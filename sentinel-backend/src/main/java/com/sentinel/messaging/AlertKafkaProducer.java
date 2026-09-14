package com.sentinel.messaging;

import com.sentinel.alert.AlertEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes an {@link AlertEvent} to Kafka whenever a new alert is persisted.
 *
 * The producer is fire-and-forget from the caller's perspective — failures are
 * logged but never propagate back to AlertRulesEngine so alert creation is
 * never blocked by Kafka unavailability.
 *
 * When Kafka is disabled (sentinel.kafka.enabled=false) the bean is still
 * instantiated but publish() returns immediately — safe for local dev without
 * a running broker.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertKafkaProducer {

    private final KafkaTemplate<String, AlertEvent> kafkaTemplate;

    @Value("${sentinel.kafka.enabled:false}")
    private boolean kafkaEnabled;

    /**
     * Converts an {@link AlertEntity} to an {@link AlertEvent} and sends it
     * to the {@code sentinel.alerts.created} topic.
     *
     * @param alert the freshly persisted alert entity
     */
    public void publish(AlertEntity alert) {
        if (!kafkaEnabled) {
            log.debug("Kafka disabled — skipping publish for alert {}", alert.getId());
            return;
        }

        AlertEvent event = AlertEvent.builder()
                .alertId(alert.getId())
                .siteId(alert.getSiteId())
                .severity(alert.getSeverity())
                .status(alert.getStatus())
                .rule(alert.getRule())
                .title(alert.getTitle())
                .description(alert.getDescription())
                .narrative(alert.getNarrative())
                .createdAt(alert.getCreatedAt())
                .build();

        kafkaTemplate.send(KafkaTopics.ALERT_CREATED, alert.getSiteId(), event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.warn("Kafka publish failed for alert {} — {}", alert.getId(), ex.getMessage());
                    } else {
                        log.debug("Kafka published alert {} → topic={} partition={} offset={}",
                                alert.getId(),
                                result.getRecordMetadata().topic(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
