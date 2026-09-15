package com.sentinel.actuation;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Actuation log entry - audit trail for valve control commands.
 * In Stage 3, all actuations are simulated (MOCK actuator).
 * Production will integrate with SCADA systems.
 */
@Entity
@Table(name = "actuation_log", indexes = {
    @Index(name = "idx_actuation_event", columnList = "event_id"),
    @Index(name = "idx_actuation_site_time", columnList = "site_id, request_timestamp DESC"),
    @Index(name = "idx_actuation_status", columnList = "status, request_timestamp DESC")
})
@Getter
@Setter
@NoArgsConstructor
public class ActuationLogEntity {

    @Id
    @Column(name = "actuation_id", length = 50)
    private String actuationId;

    @Column(name = "event_id", length = 50)
    private String eventId;

    @Column(name = "site_id", length = 20, nullable = false)
    private String siteId;

    @Column(name = "tank_id", length = 30)
    private String tankId;

    @Column(name = "action", length = 50, nullable = false)
    private String action = "CLOSE_VALVE";

    @Column(name = "actuator_type", length = 30, nullable = false)
    private String actuatorType = "MOCK";

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(name = "request_timestamp", nullable = false)
    private LocalDateTime requestTimestamp;

    @Column(name = "response_timestamp")
    private LocalDateTime responseTimestamp;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "triggered_by", length = 100)
    private String triggeredBy;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // ── Status Constants ───────────────────────────────────────────────────────

    public static final String STATUS_SIMULATED_SUCCESS = "simulated_success";
    public static final String STATUS_SIMULATED_FAILURE = "simulated_failure";
    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_TIMEOUT = "timeout";
    public static final String STATUS_ERROR = "error";

    // ── Action Constants ───────────────────────────────────────────────────────

    public static final String ACTION_CLOSE_VALVE = "CLOSE_VALVE";
    public static final String ACTION_OPEN_VALVE = "OPEN_VALVE";
    public static final String ACTION_EMERGENCY_STOP = "EMERGENCY_STOP";

    // ── Actuator Type Constants ────────────────────────────────────────────────

    public static final String ACTUATOR_MOCK = "MOCK";
    public static final String ACTUATOR_SCADA = "SCADA";
    public static final String ACTUATOR_MANUAL = "MANUAL";

    // ── Factory Methods ────────────────────────────────────────────────────────

    /**
     * Create a pending actuation record.
     */
    public static ActuationLogEntity createPending(
            String eventId,
            String siteId,
            String tankId,
            String action,
            String triggeredBy) {
        
        ActuationLogEntity log = new ActuationLogEntity();
        log.setActuationId("ACT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        log.setEventId(eventId);
        log.setSiteId(siteId);
        log.setTankId(tankId);
        log.setAction(action);
        log.setActuatorType(ACTUATOR_MOCK);
        log.setStatus(STATUS_PENDING);
        log.setRequestTimestamp(LocalDateTime.now());
        log.setTriggeredBy(triggeredBy);
        log.setNotes("Stage 3 simulated actuator - NOT connected to real valve control");
        return log;
    }

    /**
     * Create a valve close command record.
     */
    public static ActuationLogEntity createCloseValveCommand(
            String eventId,
            String siteId,
            String tankId) {
        return createPending(eventId, siteId, tankId, ACTION_CLOSE_VALVE, "EventService");
    }

    // ── Business Logic ─────────────────────────────────────────────────────────

    /**
     * Mark actuation as successful.
     */
    public void markSuccess(int latencyMs) {
        this.status = STATUS_SIMULATED_SUCCESS;
        this.latencyMs = latencyMs;
        this.responseTimestamp = LocalDateTime.now();
    }

    /**
     * Mark actuation as failed.
     */
    public void markFailure(String errorMessage) {
        this.status = STATUS_SIMULATED_FAILURE;
        this.errorMessage = errorMessage;
        this.responseTimestamp = LocalDateTime.now();
    }

    /**
     * Mark actuation as timed out.
     */
    public void markTimeout() {
        this.status = STATUS_TIMEOUT;
        this.errorMessage = "Actuation request timed out";
        this.responseTimestamp = LocalDateTime.now();
    }

    /**
     * Check if this actuation was successful.
     */
    public boolean isSuccess() {
        return STATUS_SIMULATED_SUCCESS.equals(status);
    }

    /**
     * Get human-readable description.
     */
    public String getDescription() {
        return String.format("[%s] %s for tank %s at %s - %s (latency: %dms)",
            status,
            action,
            tankId,
            siteId,
            actuatorType,
            latencyMs != null ? latencyMs : 0);
    }
}
