package com.sentinel.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplianceIndicatorRepository extends JpaRepository<ComplianceIndicatorEntity, String> {

    @Query("SELECT i FROM ComplianceIndicatorEntity i WHERE i.isActive = true ORDER BY i.domainId, i.indicatorId")
    List<ComplianceIndicatorEntity> findAllActive();

    @Query("SELECT i FROM ComplianceIndicatorEntity i WHERE i.domainId = :domainId AND i.isActive = true")
    List<ComplianceIndicatorEntity> findActiveByDomainId(@Param("domainId") String domainId);
}
