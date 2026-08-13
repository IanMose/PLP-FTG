package com.sentinel.prediction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PredictionRepository extends JpaRepository<PredictionEntity, Long> {

    /**
     * Return the single most recent prediction for each site.
     * Used by GET /api/sites/predictions and the risk summary enrichment.
     */
    @Query("""
            SELECT p FROM PredictionEntity p
            WHERE p.asOfDate = (
                SELECT MAX(p2.asOfDate)
                FROM PredictionEntity p2
                WHERE p2.siteId = p.siteId
            )
            ORDER BY p.siteId
            """)
    List<PredictionEntity> findLatestPerSite();

    /** Latest prediction for a single site — used by the site drill-down. */
    @Query("""
            SELECT p FROM PredictionEntity p
            WHERE p.siteId = :siteId
            ORDER BY p.asOfDate DESC
            LIMIT 1
            """)
    Optional<PredictionEntity> findLatestBySiteId(String siteId);
}
