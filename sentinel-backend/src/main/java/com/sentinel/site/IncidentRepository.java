package com.sentinel.site;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public interface IncidentRepository extends JpaRepository<IncidentEntity, String> {

    List<IncidentEntity> findBySiteIdOrderByIncidentDateDesc(String siteId);

    @Query("SELECT i.siteId, COUNT(i) FROM IncidentEntity i GROUP BY i.siteId")
    List<Object[]> countBySite();

    @Query("SELECT i.siteId, COUNT(i) FROM IncidentEntity i WHERE i.severity IN ('Critical', 'High') GROUP BY i.siteId")
    List<Object[]> countCriticalHighBySite();

    @Query("SELECT i.siteId, i.decision, COUNT(i) FROM IncidentEntity i GROUP BY i.siteId, i.decision")
    List<Object[]> countDecisionsBySite();

    /** Returns the subset of the given IDs that already exist — one query for a whole batch. */
    @Query("SELECT i.incidentId FROM IncidentEntity i WHERE i.incidentId IN :ids")
    Set<String> findExistingIds(@Param("ids") Set<String> ids);

    /**
     * Count incidents at a site since a given timestamp.
     * Used by NarrativeService to enrich alert narratives with recent activity context.
     */
    @Query("SELECT COUNT(i) FROM IncidentEntity i WHERE i.siteId = :siteId AND i.incidentDate > :since")
    long countBySiteIdAndIncidentDateAfter(@Param("siteId") String siteId,
                                           @Param("since") LocalDateTime since);
    /** Projection interface for aggregate incident scalars per site. */
    interface SiteIncidentScalars {
        Long getTotal();    // COUNT — never null, but boxed for consistency
        Long getCritHigh(); // SUM — returns null when no rows match
        Long getRejected(); // SUM — returns null when no rows match
    }

    /**
     * Returns aggregate incident counts for a single site in one query.
     * Used by the simulate path — avoids loading the full incident collection.
     */
    @Query("""
        SELECT COUNT(i) AS total,
               SUM(CASE WHEN i.severity IN ('Critical', 'High') THEN 1 ELSE 0 END) AS critHigh,
               SUM(CASE WHEN i.decision = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM IncidentEntity i
        WHERE i.siteId = :siteId
        """)
    SiteIncidentScalars getScalarsForSite(@Param("siteId") String siteId);

    @Query("SELECT COUNT(i) FROM IncidentEntity i")
    long countAll();
}
