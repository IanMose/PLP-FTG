package com.sentinel.telemetry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Repository for tank telemetry readings.
 * Provides queries for overfill detection, threshold monitoring, and analytics.
 */
@Repository
public interface TankTelemetryRepository extends JpaRepository<TankTelemetryEntity, String> {

    // ── Overfill Detection Queries ─────────────────────────────────────────────

    /**
     * Find readings that exceed threshold with valve still open.
     * This is the core overfill detection query.
     */
    @Query("""
        SELECT t FROM TankTelemetryEntity t
        WHERE t.tankLevelPct >= :threshold
          AND t.valveStatus = 'Open'
          AND t.readingTimestamp >= :since
        ORDER BY t.readingTimestamp DESC
        """)
    List<TankTelemetryEntity> findOverfillRiskReadings(
        @Param("threshold") BigDecimal threshold,
        @Param("since") LocalDateTime since
    );

    /**
     * Find readings with overfill flag set.
     */
    List<TankTelemetryEntity> findByOverfillFlagTrueAndReadingTimestampAfterOrderByReadingTimestampDesc(
        LocalDateTime since
    );

    /**
     * Count overfill events (distinct loading operations) since a given time.
     */
    @Query("""
        SELECT COUNT(DISTINCT t.loadingOperationId) FROM TankTelemetryEntity t
        WHERE t.tankLevelPct >= :threshold
          AND t.valveStatus = 'Open'
          AND t.readingTimestamp >= :since
        """)
    long countOverfillEvents(
        @Param("threshold") BigDecimal threshold,
        @Param("since") LocalDateTime since
    );

    // ── Loading Operation Queries ──────────────────────────────────────────────

    /**
     * Get the latest reading for each active loading operation.
     */
    @Query("""
        SELECT t FROM TankTelemetryEntity t
        WHERE t.readingTimestamp = (
            SELECT MAX(t2.readingTimestamp) FROM TankTelemetryEntity t2
            WHERE t2.loadingOperationId = t.loadingOperationId
        )
        AND t.readingTimestamp >= :since
        """)
    List<TankTelemetryEntity> findLatestByLoadingOperation(
        @Param("since") LocalDateTime since
    );

    /**
     * Get all readings for a specific loading operation (for timeline view).
     */
    List<TankTelemetryEntity> findByLoadingOperationIdOrderByReadingTimestampAsc(
        String loadingOperationId
    );

    /**
     * Check if a loading operation has any readings.
     */
    boolean existsByLoadingOperationId(String loadingOperationId);

    // ── Site-Specific Queries ──────────────────────────────────────────────────

    /**
     * Get the latest reading for a specific tank.
     */
    Optional<TankTelemetryEntity> findFirstBySiteIdAndTankIdOrderByReadingTimestampDesc(
        String siteId, String tankId
    );

    /**
     * Get recent readings for a site.
     */
    List<TankTelemetryEntity> findBySiteIdAndReadingTimestampAfterOrderByReadingTimestampDesc(
        String siteId, LocalDateTime since
    );

    /**
     * Get all tanks at a site.
     */
    @Query("SELECT DISTINCT t.tankId FROM TankTelemetryEntity t WHERE t.siteId = :siteId")
    List<String> findDistinctTankIdsBySiteId(@Param("siteId") String siteId);

    // ── ETL Deduplication Queries ──────────────────────────────────────────────

    /**
     * Find IDs that already exist (for deduplication on ETL load).
     */
    @Query("SELECT t.readingId FROM TankTelemetryEntity t WHERE t.readingId IN :ids")
    Set<String> findExistingIds(@Param("ids") Set<String> ids);

    // ── Analytics Queries ──────────────────────────────────────────────────────

    /**
     * Get average tank level by site over a period.
     */
    @Query("""
        SELECT t.siteId, AVG(t.tankLevelPct) FROM TankTelemetryEntity t
        WHERE t.readingTimestamp >= :since
        GROUP BY t.siteId
        """)
    List<Object[]> findAverageLevelBySite(@Param("since") LocalDateTime since);

    /**
     * Count readings by site.
     */
    long countBySiteId(String siteId);

    /**
     * Count all readings after a timestamp.
     */
    long countByReadingTimestampAfter(LocalDateTime since);

    /**
     * Count total overfill events (distinct loading operations) ever recorded for a site.
     * Used by NarrativeService to surface site-level overfill history in AI narratives.
     */
    @Query("""
        SELECT COUNT(DISTINCT t.loadingOperationId) FROM TankTelemetryEntity t
        WHERE t.siteId = :siteId
          AND t.tankLevelPct >= 95.0
          AND t.valveStatus = 'Open'
        """)
    long countOverfillEventsBySite(@Param("siteId") String siteId);
}
