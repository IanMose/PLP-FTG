package com.sentinel.site;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "fact_incidents")
@Getter
@Setter
@NoArgsConstructor
public class IncidentEntity {

    @Id
    @Column(name = "incident_id")
    private String incidentId;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "incident_date", nullable = false)
    private LocalDateTime incidentDate;

    @Column(name = "severity", nullable = false)
    private String severity;

    @Column(name = "description")
    private String description;

    @Column(name = "compliance_score")
    private Integer complianceScore;

    @Column(name = "status")
    private String status;

    @Column(name = "closed_date")
    private LocalDateTime closedDate;

    @Column(name = "decision", nullable = false)
    private String decision;

    @Column(name = "decision_reason")
    private String decisionReason;

    @Column(name = "batch_id")
    private String batchId;

    @Column(name = "ingestion_timestamp")
    private LocalDateTime ingestionTimestamp;
}
