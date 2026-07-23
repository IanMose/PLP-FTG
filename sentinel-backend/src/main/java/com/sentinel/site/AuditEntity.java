package com.sentinel.site;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "fact_audits")
@Getter
@Setter
@NoArgsConstructor
public class AuditEntity {

    @Id
    @Column(name = "audit_id")
    private String auditId;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "inspection_date", nullable = false)
    private LocalDateTime inspectionDate;

    @Column(name = "auditor")
    private String auditor;

    @Column(name = "findings")
    private String findings;

    @Column(name = "compliance_score")
    private Integer complianceScore;

    @Column(name = "follow_up_required")
    private Boolean followUpRequired;

    @Column(name = "closed_date")
    private LocalDateTime closedDate;

    @Column(name = "decision")
    private String decision;

    @Column(name = "decision_reason")
    private String decisionReason;

    @Column(name = "batch_id")
    private String batchId;

    @Column(name = "ingestion_timestamp")
    private LocalDateTime ingestionTimestamp;
}
