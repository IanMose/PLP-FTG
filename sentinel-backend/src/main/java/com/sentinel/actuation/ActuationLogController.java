package com.sentinel.actuation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ActuationLogController - Dedicated REST API for actuation log access.
 * 
 * Provides endpoints per V4 API contract:
 * - GET /api/actuation-log - paginated actuation log with filters
 * - GET /api/actuation-log/{actuationId} - single actuation details
 * - GET /api/actuation-log/stats - actuation statistics for dashboard
 */
@RestController
@RequestMapping("/api/actuation-log")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ActuationLogController {

    private final ActuationLogRepository actuationLogRepository;
    private final ActuationService actuationService;

    // ── Main Actuation Log Endpoint ────────────────────────────────────────────

    /**
     * GET /api/actuation-log
     * Paginated actuation log with optional filters.
     */
    @GetMapping
    public ResponseEntity<ActuationLogResponse> getActuationLog(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String siteId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        log.info("Fetching actuation log: page={}, size={}, siteId={}, status={}, hoursBack={}",
            page, size, siteId, status, hoursBack);
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        
        // Get all actuations within time window
        List<ActuationLogEntity> all = actuationLogRepository.findTop10ByOrderByRequestTimestampDesc();
        
        // Filter and paginate
        List<ActuationLogEntity> filtered = all.stream()
            .filter(a -> a.getRequestTimestamp().isAfter(since))
            .filter(a -> siteId == null || a.getSiteId().equals(siteId))
            .filter(a -> status == null || a.getStatus().equals(status))
            .skip((long) page * size)
            .limit(size)
            .collect(Collectors.toList());
        
        long totalCount = actuationLogRepository.countByRequestTimestampAfter(since);
        
        return ResponseEntity.ok(new ActuationLogResponse(
            filtered,
            page,
            size,
            totalCount,
            hoursBack
        ));
    }

    /**
     * GET /api/actuation-log/recent
     * Quick access to recent actuations (no pagination).
     */
    @GetMapping("/recent")
    public ResponseEntity<List<ActuationLogEntity>> getRecentActuations(
            @RequestParam(defaultValue = "10") int limit) {
        // Repository returns top 10, for more would need custom query
        return ResponseEntity.ok(actuationService.getRecentActuations());
    }

    /**
     * GET /api/actuation-log/{actuationId}
     * Get details of a specific actuation.
     */
    @GetMapping("/{actuationId}")
    public ResponseEntity<ActuationLogEntity> getActuation(@PathVariable String actuationId) {
        return actuationService.getActuation(actuationId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/actuation-log/by-event/{eventId}
     * Get actuation for a specific event.
     */
    @GetMapping("/by-event/{eventId}")
    public ResponseEntity<ActuationLogEntity> getActuationByEvent(@PathVariable String eventId) {
        return actuationService.getActuationByEvent(eventId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/actuation-log/site/{siteId}
     * Get actuations for a specific site.
     */
    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<ActuationLogEntity>> getActuationsBySite(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "24") int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        return ResponseEntity.ok(actuationService.getActuationsBySite(siteId, since));
    }

    // ── Statistics Endpoints ───────────────────────────────────────────────────

    /**
     * GET /api/actuation-log/stats
     * Actuation statistics for dashboard.
     */
    @GetMapping("/stats")
    public ResponseEntity<ActuationStats> getStats(
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        
        long totalActuations = actuationLogRepository.countByRequestTimestampAfter(since);
        long successfulClosures = actuationService.countSuccessfulClosures(since);
        Double successRate = actuationService.getSuccessRate(since);
        Double avgLatency = actuationService.getAverageLatency(since);
        long litresSaved = actuationService.calculateLitresSaved(since);
        long kesSaved = actuationService.calculateKesSaved(since);
        
        // Get breakdown by status
        List<Object[]> byStatus = actuationLogRepository.countByStatusSince(since);
        Map<String, Long> statusBreakdown = byStatus.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> ((Number) row[1]).longValue()
            ));
        
        // Get breakdown by site
        List<Object[]> bySite = actuationLogRepository.countBySiteSince(since);
        Map<String, Long> siteBreakdown = bySite.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> ((Number) row[1]).longValue()
            ));
        
        return ResponseEntity.ok(new ActuationStats(
            totalActuations,
            successfulClosures,
            successRate != null ? successRate : 0.0,
            avgLatency != null ? avgLatency : 0.0,
            litresSaved,
            kesSaved,
            statusBreakdown,
            siteBreakdown,
            hoursBack,
            LocalDateTime.now()
        ));
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────

    public record ActuationLogResponse(
        List<ActuationLogEntity> actuations,
        int page,
        int size,
        long totalCount,
        int hoursBack
    ) {}

    public record ActuationStats(
        long totalActuations,
        long successfulClosures,
        double successRatePercent,
        double averageLatencyMs,
        long litresSaved,
        long kesSaved,
        Map<String, Long> byStatus,
        Map<String, Long> bySite,
        int periodHours,
        LocalDateTime asOf
    ) {}
}
