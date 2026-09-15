package com.sentinel.messaging;

/**
 * Central registry of Kafka topic names.
 * Both producer and consumer reference these constants — no magic strings.
 */
public final class KafkaTopics {

    /** Published whenever a new alert is created by AlertRulesEngine. */
    public static final String ALERT_CREATED = "sentinel.alerts.created";

    private KafkaTopics() {}
}
