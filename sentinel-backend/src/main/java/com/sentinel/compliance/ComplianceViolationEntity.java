package com.sentinel.compliance;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_violations")
@Getter
@Setter
@NoArgsConstructor
public class ComplianceViolationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rule_id", nullable = false)
    private String ruleId;

    @Column(name = "rule_name", nullable = false)
    private String ruleName;

    @Column(name = "indicator_id", nullable = false)
    private String indicatorId;

    @Column(name = "domain_id", nullable = false)
    private String domainId;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "asset_reference")
    private String assetReference;

    @Column(name = "severity", nullable = false)
    private String severity;

    @Column(name = "violation_date", nullable = false)
    private LocalDate violationDate;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "recommended_action")
    private String recommendedAction;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
