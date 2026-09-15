package com.sentinel.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * EventLogController - Dedicated REST API for event log access.
 * 
 * Provides endpoints per V4 API contract:
 * - GET /api/event-log - paginated event log with filters
 * - GET /api/event-log/{eventId} - single event details
 * - GET /api/event-log/stats - event statistics for dashboard
 */
@RestController
@RequestMapping("/api/event-log")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class EventLogController {

    private final EventRepository eventRepository;
    private final EventService eventService;

    // ── Main Event Log Endpoint ────────────────────────────────────────────────

    /**
     * GET /api/event-log
     * Paginated event log with optional filters.
     */
    @GetMapping
    public ResponseEntity<EventLogResponse> getEventLog(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String siteId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        log.info("Fetching event log: page={}, size={}, siteId={}, eventType={}, severity={}, hoursBack={}",
            page, size, siteId, eventType, severity, hoursBack);
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        // For simplicity, fetch all and filter in memory (small dataset for demo)
        // In production, would use Specification pattern for dynamic queries
        List<EventEntity> allEvents = eventRepository.findAll(pageRequest).getContent();
        
        List<EventEntity> filtered = allEvents.stream()
            .filter(e -> e.getCreatedAt().isAfter(since))
            .filter(e -> siteId == null || e.getSiteId().equals(siteId))
            .filter(e -> eventType == null || e.getEventType().equals(eventType))
            .filter(e -> severity == null || e.getSeverity().equals(severity))
            .collect(Collectors.toList());
        
        long totalCount = eventRepository.countByCreatedAtAfter(since);
        
        return ResponseEntity.ok(new EventLogResponse(
            filtered,
            page,
            size,
            totalCount,
            hoursBack
        ));
    }

    /**
     * GET /api/event-log/recent
     * Quick access to recent events (no pagination).
     */
    @GetMapping("/recent")
    public ResponseEntity<List<EventEntity>> getRecentEvents(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(eventService.getRecentEvents(limit));
    }

    /**
     * GET /api/event-log/{eventId}
     * Get details of a specific event.
     */
    @GetMapping("/{eventId}")
    public ResponseEntity<EventEntity> getEvent(@PathVariable String eventId) {
        return eventService.getEvent(eventId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/event-log/site/{siteId}
     * Get events for a specific site.
     */
    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<EventEntity>> getEventsBySite(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "24") int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        return ResponseEntity.ok(eventService.getEventsBySite(siteId, since));
    }

    // ── Statistics Endpoints ───────────────────────────────────────────────────

    /**
     * GET /api/event-log/stats
     * Event statistics for dashboard.
     */
    @GetMapping("/stats")
    public ResponseEntity<EventStats> getStats(
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        
        long totalEvents = eventService.countTotalEvents(since);
        long overfillEvents = eventService.countOverfillEvents(since);
        long actuationEvents = eventService.countActuationEvents(since);
        
        // Get breakdowns
        List<Object[]> byType = eventRepository.countByEventTypeSince(since);
        Map<String, Long> typeBreakdown = byType.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> ((Number) row[1]).longValue()
            ));
        
        List<Object[]> bySeverity = eventRepository.countBySeveritySince(since);
        Map<String, Long> severityBreakdown = bySeverity.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> ((Number) row[1]).longValue()
            ));
        
        List<Object[]> bySite = eventRepository.countBySiteSince(since);
        Map<String, Long> siteBreakdown = bySite.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> ((Number) row[1]).longValue()
            ));
        
        return ResponseEntity.ok(new EventStats(
            totalEvents,
            overfillEvents,
            actuationEvents,
            typeBreakdown,
            severityBreakdown,
            siteBreakdown,
            hoursBack,
            LocalDateTime.now()
        ));
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────

    public record EventLogResponse(
        List<EventEntity> events,
        int page,
        int size,
        long totalCount,
        int hoursBack
    ) {}

    public record EventStats(
        long totalEvents,
        long overfillEvents,
        long actuationEvents,
        Map<String, Long> byEventType,
        Map<String, Long> bySeverity,
        Map<String, Long> bySite,
        int periodHours,
        LocalDateTime asOf
    ) {}
}
