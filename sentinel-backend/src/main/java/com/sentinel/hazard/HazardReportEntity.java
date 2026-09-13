package com.sentinel.hazard;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "hazard_report")
@Getter @Setter @NoArgsConstructor
public class HazardReportEntity {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "asset_id")
    private Long assetId;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "severity_estimate", nullable = false)
    private String severityEstimate;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "likelihood_rating")
    private Integer likelihoodRating;

    @Column(name = "severity_rating")
    private Integer severityRating;

    @Column(name = "risk_rating")
    private Integer riskRating;

    @Column(name = "mitigation_note", columnDefinition = "TEXT")
    private String mitigationNote;

    @Column(name = "assessed_by")
    private Long assessedBy;

    @Column(name = "assessed_at")
    private LocalDateTime assessedAt;

    @Column(name = "linked_alert_id")
    private String linkedAlertId;

    @Column(name = "status", nullable = false)
    private String status = "open";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * V18: 'hazard' (default) | 'near_miss'
     * Backwards-compatible — existing rows default to 'hazard' at DB level.
     */
    @Column(name = "report_type", nullable = false, length = 20)
    private String reportType = "hazard";
}
