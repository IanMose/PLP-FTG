package com.sentinel.compliance;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_indicators")
@Getter
@Setter
@NoArgsConstructor
public class ComplianceIndicatorEntity {

    @Id
    @Column(name = "indicator_id")
    private String indicatorId;

    @Column(name = "indicator_name", nullable = false)
    private String indicatorName;

    @Column(name = "domain_id", nullable = false)
    private String domainId;

    @Column(name = "indicator_weight", nullable = false)
    private Double indicatorWeight;

    @Column(name = "green_threshold", nullable = false)
    private Double greenThreshold;

    @Column(name = "amber_threshold", nullable = false)
    private Double amberThreshold;

    @Column(name = "indicator_type", nullable = false)
    private String indicatorType;

    @Column(name = "description")
    private String description;

    @Column(name = "formula_description")
    private String formulaDescription;

    @Column(name = "data_sources")
    private String dataSources;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
