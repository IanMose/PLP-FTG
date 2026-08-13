package com.sentinel.site;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public interface AuditRepository extends JpaRepository<AuditEntity, String> {

    List<AuditEntity> findBySiteIdOrderByInspectionDateDesc(String siteId);

    @Query("SELECT a.siteId, MAX(a.inspectionDate) FROM AuditEntity a GROUP BY a.siteId")
    List<Object[]> findLatestAuditDateBySite();

    /**
     * Returns the most recent inspection date for a single site.
     * Used by the simulate path — avoids loading all audit rows.
     */
    @Query("SELECT MAX(a.inspectionDate) FROM AuditEntity a WHERE a.siteId = :siteId")
    LocalDateTime findLatestAuditDateForSite(@Param("siteId") String siteId);

    /** Returns the subset of the given IDs that already exist — one query for a whole batch. */
    @Query("SELECT a.auditId FROM AuditEntity a WHERE a.auditId IN :ids")
    Set<String> findExistingIds(@Param("ids") Set<String> ids);
}
