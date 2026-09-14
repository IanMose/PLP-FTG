package com.sentinel.event;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Control-plane event log entry.
 * Records every threshold breach, anomaly detection, or automation trigger
 * for audit trail and the "detect → act → notify" demo loop.
 */
@Entity
@Table(name = "event_log", indexes = {
    @Index(name = "idx_event_site_time", columnList = "site_id, created_at DESC"),
    @Index(name = "idx_event_unprocessed", columnList = "processed, created_at"),
    @Index(name = "idx_event_loading_op", columnList = "loading_operation_id, event_type")
})
@Getter
@Setter
@NoArgsConstructor
public class EventEntity {

    @Id
    @Column(name = "event_id", length = 50)
    private String eventId;

    @Column(name = "event_type", length = 50, nullable = false)
    private String eventType;

    @Column(name = "severity", length = 20, nullable = false)
    private String severity;

    @Column(name = "site_id", length = 20, nullable = false)
    private String siteId;

    @Column(name = "tank_id", length = 30)
    private String tankId;

    @Column(name = "signal_type", length = 50, nullable = false)
    private String signalType;

    @Column(name = "signal_value", precision = 10, scale = 4)
    private BigDecimal signalValue;

    @Column(name = "threshold_value", precision = 10, scale = 4)
    private BigDecimal thresholdValue;

    @Column(name = "source_reading_id", length = 50)
    private String sourceReadingId;

    @Column(name = "loading_operation_id", length = 50)
    private String loadingOperationId;

    @Column(name = "alert_id", length = 50)
    private String alertId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed")
    private Boolean processed = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "actuation_triggered")
    private Boolean actuationTriggered = false;

    @Column(name = "notification_sent")
    private Boolean notificationSent = false;

    // ── Event Type Constants ───────────────────────────────────────────────────

    public static final String TYPE_OVERFILL_RISK = "overfill_risk";
    public static final String TYPE_PRESSURE_BREACH = "pressure_breach";
    public static final String TYPE_THRESHOLD_WARNING = "threshold_warning";
    public static final String TYPE_SYSTEM_ALERT = "system_alert";

    // ── Severity Constants ─────────────────────────────────────────────────────

    public static final String SEVERITY_LOW = "Low";
    public static final String SEVERITY_MEDIUM = "Medium";
    public static final String SEVERITY_HIGH = "High";
    public static final String SEVERITY_CRITICAL = "Critical";

    // ── Factory Methods ────────────────────────────────────────────────────────

    /**
     * Create an overfill risk event from a tank telemetry reading.
     */
    public static EventEntity createOverfillEvent(
            String siteId,
            String tankId,
            String readingId,
            String loadingOperationId,
            BigDecimal tankLevel,
            String severity) {
        
        EventEntity event = new EventEntity();
        event.setEventId("EVT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        event.setEventType(TYPE_OVERFILL_RISK);
        event.setSeverity(severity);
        event.setSiteId(siteId);
        event.setTankId(tankId);
        event.setSignalType("tank_level_pct");
        event.setSignalValue(tankLevel);
        event.setThresholdValue(new BigDecimal("95.00"));
        event.setSourceReadingId(readingId);
        event.setLoadingOperationId(loadingOperationId);
        event.setCreatedAt(LocalDateTime.now());
        event.setProcessed(false);
        return event;
    }

    /**
     * Create a threshold warning event.
     */
    public static EventEntity createWarningEvent(
            String siteId,
            String tankId,
            String signalType,
            BigDecimal signalValue,
            BigDecimal threshold) {
        
        EventEntity event = new EventEntity();
        event.setEventId("EVT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        event.setEventType(TYPE_THRESHOLD_WARNING);
        event.setSeverity(SEVERITY_MEDIUM);
        event.setSiteId(siteId);
        event.setTankId(tankId);
        event.setSignalType(signalType);
        event.setSignalValue(signalValue);
        event.setThresholdValue(threshold);
        event.setCreatedAt(LocalDateTime.now());
        event.setProcessed(false);
        return event;
    }

    // ── Business Logic ─────────────────────────────────────────────────────────

    /**
     * Mark the event as processed.
     */
    public void markProcessed() {
        this.processed = true;
        this.processedAt = LocalDateTime.now();
    }

    /**
     * Mark that actuation was triggered for this event.
     */
    public void markActuationTriggered() {
        this.actuationTriggered = true;
    }

    /**
     * Mark that notification was sent for this event.
     */
    public void markNotificationSent() {
        this.notificationSent = true;
    }

    /**
     * Check if this event requires immediate actuation.
     */
    public boolean requiresActuation() {
        return TYPE_OVERFILL_RISK.equals(eventType) 
            && (SEVERITY_HIGH.equals(severity) || SEVERITY_CRITICAL.equals(severity));
    }

    /**
     * Get a human-readable description of the event.
     */
    public String getDescription() {
        return String.format("[%s] %s at %s - Tank %s: %.2f%% (threshold: %.2f%%)",
            severity,
            eventType,
            siteId,
            tankId,
            signalValue != null ? signalValue.doubleValue() : 0.0,
            thresholdValue != null ? thresholdValue.doubleValue() : 0.0);
    }
}
