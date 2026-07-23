package com.sentinel.site;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AuditRepository extends JpaRepository<AuditEntity, String> {

    List<AuditEntity> findBySiteIdOrderByInspectionDateDesc(String siteId);

    @Query("SELECT a.siteId, MAX(a.inspectionDate) FROM AuditEntity a GROUP BY a.siteId")
    List<Object[]> findLatestAuditDateBySite();
}
