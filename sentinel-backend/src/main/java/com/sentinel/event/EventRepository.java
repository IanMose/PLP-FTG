package com.sentinel.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for control-plane events.
 * Provides queries for event processing, deduplication, and analytics.
 */
@Repository
public interface EventRepository extends JpaRepository<EventEntity, String> {

    // ── Event Processing Queries ───────────────────────────────────────────────

    /**
     * Find unprocessed events ordered by creation time.
     */
    List<EventEntity> findByProcessedFalseOrderByCreatedAtAsc();

    /**
     * Find unprocessed events of a specific type.
     */
    List<EventEntity> findByEventTypeAndProcessedFalseOrderByCreatedAtAsc(String eventType);

    /**
     * Find recent events by site.
     */
    List<EventEntity> findBySiteIdAndCreatedAtAfterOrderByCreatedAtDesc(
        String siteId, LocalDateTime since
    );

    /**
     * Find events by type and severity.
     */
    List<EventEntity> findByEventTypeAndSeverityAndCreatedAtAfterOrderByCreatedAtDesc(
        String eventType, String severity, LocalDateTime since
    );

    // ── Deduplication Queries ──────────────────────────────────────────────────

    /**
     * Check if an overfill event already exists for this loading operation.
     * Used to prevent duplicate events during the same loading session.
     */
    boolean existsByLoadingOperationIdAndEventType(String loadingOperationId, String eventType);

    /**
     * Find the most recent event for a loading operation.
     */
    Optional<EventEntity> findFirstByLoadingOperationIdOrderByCreatedAtDesc(String loadingOperationId);

    /**
     * Check if an event was already created for this source reading.
     */
    boolean existsBySourceReadingId(String sourceReadingId);

    // ── Analytics Queries ──────────────────────────────────────────────────────

    /**
     * Count events by type since a given time.
     */
    long countByEventTypeAndCreatedAtAfter(String eventType, LocalDateTime since);

    /**
     * Count events that triggered actuation.
     */
    long countByActuationTriggeredTrueAndCreatedAtAfter(LocalDateTime since);

    /**
     * Count events where notification was sent.
     */
    long countByNotificationSentTrueAndCreatedAtAfter(LocalDateTime since);

    /**
     * Get event counts by type (for dashboard).
     */
    @Query("""
        SELECT e.eventType, COUNT(e) FROM EventEntity e
        WHERE e.createdAt >= :since
        GROUP BY e.eventType
        """)
    List<Object[]> countByEventTypeSince(@Param("since") LocalDateTime since);

    /**
     * Get event counts by severity (for dashboard).
     */
    @Query("""
        SELECT e.severity, COUNT(e) FROM EventEntity e
        WHERE e.createdAt >= :since
        GROUP BY e.severity
        """)
    List<Object[]> countBySeveritySince(@Param("since") LocalDateTime since);

    /**
     * Get event counts by site (for dashboard).
     */
    @Query("""
        SELECT e.siteId, COUNT(e) FROM EventEntity e
        WHERE e.createdAt >= :since
        GROUP BY e.siteId
        ORDER BY COUNT(e) DESC
        """)
    List<Object[]> countBySiteSince(@Param("since") LocalDateTime since);

    // ── Recent Events Feed ─────────────────────────────────────────────────────

    /**
     * Get the N most recent events (for live feed).
     */
    List<EventEntity> findTop10ByOrderByCreatedAtDesc();

    /**
     * Get recent events with pagination.
     */
    @Query("""
        SELECT e FROM EventEntity e
        ORDER BY e.createdAt DESC
        LIMIT :limit
        """)
    List<EventEntity> findRecentEvents(@Param("limit") int limit);

    /**
     * Get total event count.
     */
    long countByCreatedAtAfter(LocalDateTime since);
}
