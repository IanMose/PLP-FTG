package com.sentinel.hse;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * EsgMetricEntity — a single ESG metric record promoted from an approved HSE report.
 *
 * Each approved HseReportEntity generates multiple EsgMetricEntity rows,
 * one per metric extracted (E/S/G area + metric name + value).
 *
 * These records feed the ESG Report dashboard alongside live operational metrics.
 * They represent the "human-verified" layer — only APPROVED reports contribute here.
 */
@Entity
@Table(name = "esg_metric", indexes = {
    @Index(name = "idx_esg_metric_area",   columnList = "esg_area, period"),
    @Index(name = "idx_esg_metric_report", columnList = "source_report_id"),
    @Index(name = "idx_esg_metric_period", columnList = "period")
})
@Getter
@Setter
@NoArgsConstructor
public class EsgMetricEntity {

    @Id
    @Column(name = "metric_id", length = 50)
    private String metricId;

    /** E | S | G */
    @Column(name = "esg_area", length = 20, nullable = false)
    private String esgArea;

    /** Human-readable metric name, e.g. "Spill incidents prevented" */
    @Column(name = "metric_name", length = 200, nullable = false)
    private String metricName;

    /** Value as string — numeric, percent, label, etc. */
    @Column(name = "metric_value", length = 200, nullable = false)
    private String metricValue;

    /** Unit: count, %, hours, litres, KES, classification, name */
    @Column(name = "unit", length = 50)
    private String unit;

    /** Reporting period: yyyy-MM */
    @Column(name = "period", length = 10, nullable = false)
    private String period;

    /** Source description, e.g. "HSE Report HSE-2026-XXXX" */
    @Column(name = "source", length = 200)
    private String source;

    /**
     * SYSTEM_GENERATED | CALCULATED | HUMAN_ENTERED | PENDING_VERIFICATION
     * Matches the verification status terminology from the ESG Data Table schema.
     */
    @Column(name = "verification_status", length = 50, nullable = false)
    private String verificationStatus;

    /** The HSE report this metric was promoted from. */
    @Column(name = "source_report_id", length = 50, nullable = false)
    private String sourceReportId;

    @Column(name = "promoted_at", nullable = false)
    private LocalDateTime promotedAt;

    // ── Factory ───────────────────────────────────────────────────────────────

    public static EsgMetricEntity of(String esgArea, String metricName, String metricValue,
                                      String unit, String period, String source,
                                      String verificationStatus, String sourceReportId) {
        EsgMetricEntity m = new EsgMetricEntity();
        m.setMetricId("ESG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        m.setEsgArea(esgArea);
        m.setMetricName(metricName);
        m.setMetricValue(metricValue);
        m.setUnit(unit);
        m.setPeriod(period);
        m.setSource(source);
        m.setVerificationStatus(verificationStatus);
        m.setSourceReportId(sourceReportId);
        m.setPromotedAt(LocalDateTime.now());
        return m;
    }
}
