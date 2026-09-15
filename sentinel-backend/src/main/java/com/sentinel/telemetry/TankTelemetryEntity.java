package com.sentinel.telemetry;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Tank-level telemetry readings during loading operations.
 * This is the primary signal for overfill/spill detection (Problem 10).
 * 
 * Key fields:
 * - tankLevelPct: 0-100, threshold breach at 95%
 * - valveStatus: Open/Closed/Partially Open
 * - loadingOperationId: links readings in the same loading session
 * 
 * Overfill risk condition: tankLevelPct >= 95% AND valveStatus = "Open"
 */
@Entity
@Table(name = "fact_tank_telemetry", indexes = {
    @Index(name = "idx_tank_tel_site_time", columnList = "site_id, reading_timestamp DESC"),
    @Index(name = "idx_tank_tel_loading", columnList = "loading_operation_id, reading_timestamp")
})
@Getter
@Setter
@NoArgsConstructor
public class TankTelemetryEntity {

    @Id
    @Column(name = "reading_id", length = 50)
    private String readingId;

    @Column(name = "site_id", length = 20, nullable = false)
    private String siteId;

    @Column(name = "tank_id", length = 30, nullable = false)
    private String tankId;

    @Column(name = "reading_timestamp", nullable = false)
    private LocalDateTime readingTimestamp;

    @Column(name = "tank_level_pct", precision = 5, scale = 2, nullable = false)
    private BigDecimal tankLevelPct;

    @Column(name = "flow_rate_bph", precision = 10, scale = 2)
    private BigDecimal flowRateBph;

    @Column(name = "valve_status", length = 20, nullable = false)
    private String valveStatus = "Unknown";

    @Column(name = "sensor_id", length = 30)
    private String sensorId;

    @Column(name = "loading_operation_id", length = 50)
    private String loadingOperationId;

    @Column(name = "overfill_flag")
    private Boolean overfillFlag = false;

    @Column(name = "batch_id", length = 100)
    private String batchId;

    @Column(name = "ingestion_timestamp")
    private LocalDateTime ingestionTimestamp;

    // ── Threshold constants ────────────────────────────────────────────────────

    public static final BigDecimal OVERFILL_THRESHOLD = new BigDecimal("95.00");
    public static final BigDecimal WARNING_THRESHOLD = new BigDecimal("90.00");
    public static final BigDecimal CRITICAL_THRESHOLD = new BigDecimal("98.00");

    // ── Business logic helpers ─────────────────────────────────────────────────

    /**
     * Check if this reading represents an overfill risk condition.
     * Overfill risk = tank level >= 95% AND valve is Open
     */
    public boolean isOverfillRisk() {
        return tankLevelPct != null 
            && tankLevelPct.compareTo(OVERFILL_THRESHOLD) >= 0
            && "Open".equalsIgnoreCase(valveStatus);
    }

    /**
     * Check if this reading is at warning level (90-95%)
     */
    public boolean isWarningLevel() {
        return tankLevelPct != null
            && tankLevelPct.compareTo(WARNING_THRESHOLD) >= 0
            && tankLevelPct.compareTo(OVERFILL_THRESHOLD) < 0;
    }

    /**
     * Check if this reading is at critical level (>= 98%)
     */
    public boolean isCriticalLevel() {
        return tankLevelPct != null
            && tankLevelPct.compareTo(CRITICAL_THRESHOLD) >= 0;
    }

    /**
     * Determine severity based on tank level.
     */
    public String determineSeverity() {
        if (tankLevelPct == null) return "Low";
        double level = tankLevelPct.doubleValue();
        if (level >= 98.0 && "Open".equalsIgnoreCase(valveStatus)) return "Critical";
        if (level >= 95.0 && "Open".equalsIgnoreCase(valveStatus)) return "High";
        if (level >= 90.0) return "Medium";
        return "Low";
    }

    /**
     * Create a display-friendly description of the reading.
     */
    public String getDescription() {
        return String.format("Tank %s at %s: %.2f%% fill, valve %s",
            tankId, siteId, 
            tankLevelPct != null ? tankLevelPct.doubleValue() : 0.0,
            valveStatus);
    }
}
