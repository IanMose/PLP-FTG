package com.sentinel.site;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IncidentRepository extends JpaRepository<IncidentEntity, String> {

    List<IncidentEntity> findBySiteIdOrderByIncidentDateDesc(String siteId);

    @Query("SELECT i.siteId, COUNT(i) FROM IncidentEntity i GROUP BY i.siteId")
    List<Object[]> countBySite();

    @Query("SELECT i.siteId, i.decision, COUNT(i) FROM IncidentEntity i GROUP BY i.siteId, i.decision")
    List<Object[]> countDecisionsBySite();
}
