package com.sentinel.compliance;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_scores")
@Getter
@Setter
@NoArgsConstructor
public class ComplianceScoreEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "indicator_id", nullable = false)
    private String indicatorId;

    @Column(name = "domain_id", nullable = false)
    private String domainId;

    @Column(name = "score", nullable = false)
    private BigDecimal score;

    @Column(name = "rag_status", nullable = false)
    private String ragStatus;

    @Column(name = "numerator")
    private Integer numerator;

    @Column(name = "denominator")
    private Integer denominator;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "calculated_at", nullable = false)
    private LocalDateTime calculatedAt;

    @Column(name = "config_version", nullable = false)
    private Integer configVersion;
}
