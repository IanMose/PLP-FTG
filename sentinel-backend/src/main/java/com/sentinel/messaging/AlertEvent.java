package com.sentinel.messaging;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Immutable event published to Kafka whenever a new alert is created.
 * Serialised as JSON by JsonSerializer — all fields must be Jackson-compatible.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertEvent {

    private String alertId;
    private String siteId;
    private String severity;   // "Critical" | "High" | "Medium" | "Low"
    private String status;     // "active"
    private String rule;
    private String title;
    private String description;
    private String narrative;
    private LocalDateTime createdAt;
}
