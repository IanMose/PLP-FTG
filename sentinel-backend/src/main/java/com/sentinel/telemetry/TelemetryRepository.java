package com.sentinel.telemetry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface TelemetryRepository extends JpaRepository<TelemetryEntity, String> {

    List<TelemetryEntity> findBySiteOrderByTimestampDesc(String site);

    @Query("SELECT t.site, COUNT(t) FROM TelemetryEntity t WHERE t.pressurePsi > 800 OR t.pressurePsi < 0 GROUP BY t.site")
    List<Object[]> countPressureSpikesBySite();

    @Query("SELECT t.site, COUNT(t) FROM TelemetryEntity t GROUP BY t.site")
    List<Object[]> countBySite();

    @Query("SELECT t.site, AVG(t.pressurePsi), AVG(t.flowRateBph), AVG(t.temperatureCelsius) FROM TelemetryEntity t GROUP BY t.site")
    List<Object[]> avgReadingsBySite();

    @Query("SELECT t FROM TelemetryEntity t WHERE t.site = :site ORDER BY t.timestamp DESC LIMIT 20")
    List<TelemetryEntity> findLatestBySite(String site);

    /**
     * Count pressure anomalies for a specific site since a given timestamp.
     * Pressure is considered anomalous if > 800 psi or < 0 psi.
     * Used by NarrativeService to enrich alert narratives with telemetry context.
     */
    @Query("SELECT COUNT(t) FROM TelemetryEntity t " +
           "WHERE t.site = :siteId " +
           "AND t.timestamp > :since " +
           "AND (t.pressurePsi > 800 OR t.pressurePsi < 0)")
    long countPressureSpikesForSiteSince(@Param("siteId") String siteId,
                                         @Param("since") LocalDateTime since);

    /**
     * Counts pressure spikes for a single site directly.
     * Replaces the current approach of loading all sites and filtering in Java.
     */
    @Query("SELECT COUNT(t) FROM TelemetryEntity t WHERE t.site = :site AND (t.pressurePsi > 800 OR t.pressurePsi < 0)")
    Long countSpikesForSite(@Param("site") String site);
}
