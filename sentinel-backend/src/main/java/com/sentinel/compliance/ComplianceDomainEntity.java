package com.sentinel.compliance;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "compliance_domains")
@Getter
@Setter
@NoArgsConstructor
public class ComplianceDomainEntity {

    @Id
    @Column(name = "domain_id")
    private String domainId;

    @Column(name = "domain_name", nullable = false)
    private String domainName;

    @Column(name = "domain_weight", nullable = false)
    private Double domainWeight;

    @Column(name = "description")
    private String description;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
