package com.sentinel.site;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface IncidentRepository extends JpaRepository<IncidentEntity, String> {

    List<IncidentEntity> findBySiteIdOrderByIncidentDateDesc(String siteId);

    @Query("SELECT i.siteId, COUNT(i) FROM IncidentEntity i GROUP BY i.siteId")
    List<Object[]> countBySite();

    @Query("SELECT i.siteId, i.decision, COUNT(i) FROM IncidentEntity i GROUP BY i.siteId, i.decision")
    List<Object[]> countDecisionsBySite();

    /** Returns the subset of the given IDs that already exist — one query for a whole batch. */
    @Query("SELECT i.incidentId FROM IncidentEntity i WHERE i.incidentId IN :ids")
    Set<String> findExistingIds(@Param("ids") Set<String> ids);
}
