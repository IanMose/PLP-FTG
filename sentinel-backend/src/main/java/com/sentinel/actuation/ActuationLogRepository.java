package com.sentinel.actuation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for actuation log entries.
 * Provides queries for audit trail, analytics, and executive dashboard.
 */
@Repository
public interface ActuationLogRepository extends JpaRepository<ActuationLogEntity, String> {

    // ── Event-Based Queries ────────────────────────────────────────────────────

    /**
     * Find actuation by event ID.
     */
    Optional<ActuationLogEntity> findByEventId(String eventId);

    /**
     * Check if actuation exists for an event.
     */
    boolean existsByEventId(String eventId);

    /**
     * Find all actuations for an event (in case of retries).
     */
    List<ActuationLogEntity> findByEventIdOrderByRequestTimestampDesc(String eventId);

    // ── Site-Based Queries ─────────────────────────────────────────────────────

    /**
     * Find recent actuations for a site.
     */
    List<ActuationLogEntity> findBySiteIdAndRequestTimestampAfterOrderByRequestTimestampDesc(
        String siteId, LocalDateTime since
    );

    /**
     * Find all actuations for a tank.
     */
    List<ActuationLogEntity> findBySiteIdAndTankIdOrderByRequestTimestampDesc(
        String siteId, String tankId
    );

    // ── Status-Based Queries ───────────────────────────────────────────────────

    /**
     * Find actuations by status.
     */
    List<ActuationLogEntity> findByStatusAndRequestTimestampAfterOrderByRequestTimestampDesc(
        String status, LocalDateTime since
    );

    /**
     * Find pending actuations (for retry processing).
     */
    List<ActuationLogEntity> findByStatusOrderByRequestTimestampAsc(String status);

    // ── Analytics Queries ──────────────────────────────────────────────────────

    /**
     * Count successful actuations since a given time.
     */
    long countByStatusAndRequestTimestampAfter(String status, LocalDateTime since);

    /**
     * Count all actuations since a given time.
     */
    long countByRequestTimestampAfter(LocalDateTime since);

    /**
     * Count actuations by status (for dashboard).
     */
    @Query("""
        SELECT a.status, COUNT(a) FROM ActuationLogEntity a
        WHERE a.requestTimestamp >= :since
        GROUP BY a.status
        """)
    List<Object[]> countByStatusSince(@Param("since") LocalDateTime since);

    /**
     * Count actuations by site (for dashboard).
     */
    @Query("""
        SELECT a.siteId, COUNT(a) FROM ActuationLogEntity a
        WHERE a.requestTimestamp >= :since
        GROUP BY a.siteId
        ORDER BY COUNT(a) DESC
        """)
    List<Object[]> countBySiteSince(@Param("since") LocalDateTime since);

    /**
     * Get average latency for successful actuations.
     */
    @Query("""
        SELECT AVG(a.latencyMs) FROM ActuationLogEntity a
        WHERE a.status = 'simulated_success'
          AND a.requestTimestamp >= :since
        """)
    Double getAverageLatencySince(@Param("since") LocalDateTime since);

    /**
     * Calculate success rate.
     * Returns null if no actuations exist (NULLIF prevents divide-by-zero).
     */
    @Query("""
        SELECT 
            COUNT(CASE WHEN a.status = 'simulated_success' THEN 1 END) * 100.0 / NULLIF(COUNT(a), 0)
        FROM ActuationLogEntity a
        WHERE a.requestTimestamp >= :since
        """)
    Double getSuccessRateSince(@Param("since") LocalDateTime since);

    // ── Recent Actuations Feed ─────────────────────────────────────────────────

    /**
     * Get the N most recent actuations.
     */
    List<ActuationLogEntity> findTop10ByOrderByRequestTimestampDesc();

    /**
     * Get recent successful valve closures (for executive dashboard KPI).
     */
    @Query("""
        SELECT a FROM ActuationLogEntity a
        WHERE a.action = 'CLOSE_VALVE'
          AND a.status = 'simulated_success'
          AND a.requestTimestamp >= :since
        ORDER BY a.requestTimestamp DESC
        """)
    List<ActuationLogEntity> findRecentSuccessfulClosures(@Param("since") LocalDateTime since);
}
