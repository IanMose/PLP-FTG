package com.sentinel.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplianceViolationRepository extends JpaRepository<ComplianceViolationEntity, Long> {

    @Query("SELECT v FROM ComplianceViolationEntity v WHERE v.siteId = :siteId AND v.status = 'OPEN' ORDER BY v.severity DESC, v.violationDate DESC")
    List<ComplianceViolationEntity> findOpenBySiteId(@Param("siteId") String siteId);

    @Query("SELECT v FROM ComplianceViolationEntity v WHERE v.status = 'OPEN' ORDER BY v.severity DESC, v.violationDate DESC")
    List<ComplianceViolationEntity> findAllOpen();

    @Query("SELECT v FROM ComplianceViolationEntity v WHERE v.indicatorId = :indicatorId AND v.status = 'OPEN'")
    List<ComplianceViolationEntity> findOpenByIndicatorId(@Param("indicatorId") String indicatorId);

    @Query("SELECT v FROM ComplianceViolationEntity v WHERE v.domainId = :domainId AND v.status = 'OPEN'")
    List<ComplianceViolationEntity> findOpenByDomainId(@Param("domainId") String domainId);
}
