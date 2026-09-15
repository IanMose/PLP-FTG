package com.sentinel.executive;

import com.sentinel.actuation.ActuationService;
import com.sentinel.event.EventEntity;
import com.sentinel.event.EventRepository;
import com.sentinel.event.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ExecutiveController - Executive dashboard API.
 * 
 * Provides the "4 big numbers" that executives care about:
 * 1. Events Detected - total overfill events caught
 * 2. Shutdowns Triggered - successful valve closures
 * 3. Litres Saved - estimated fuel saved from spills prevented
 * 4. KES Avoided - monetary loss prevented
 * 
 * Plus recent events feed and site breakdown for the dashboard.
 */
@RestController
@RequestMapping("/api/executive")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ExecutiveController {

    private final EventService eventService;
    private final EventRepository eventRepository;
    private final ActuationService actuationService;

    // ── Main Dashboard Endpoint ────────────────────────────────────────────────

    /**
     * GET /api/executive/kpis (or /summary)
     * Returns the 4 big numbers for the executive dashboard.
     * The /summary alias matches the V4 build plan specification.
     */
    @GetMapping({"/kpis", "/summary"})
    public ResponseEntity<ExecutiveSummaryV5> getKpis(
            @RequestParam(defaultValue = "720") int hoursBack) {
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        log.info("Fetching executive KPIs for last {} hours", hoursBack);

        // Core metrics
        long eventsDetected = eventService.countOverfillEvents(since);
        long shutdownsTriggered = actuationService.countSuccessfulClosures(since);
        long litresSaved = actuationService.calculateLitresSaved(since);
        long kesSaved = actuationService.calculateKesSaved(since);
        
        // Verification metrics
        Double avgResponseTime = actuationService.getAverageResponseTimeSec(since);
        Double avgVerificationTime = actuationService.getAverageVerificationTimeSec(since);
        long unverifiedCount = actuationService.countUnverifiedActuations(since);
        Double successRate = actuationService.getSuccessRate(since);

        String period = hoursBack >= 720 ? "last_30_days" : 
                       hoursBack >= 168 ? "last_7_days" : 
                       hoursBack >= 24 ? "last_24_hours" : "custom";
        
        return ResponseEntity.ok(new ExecutiveSummaryV5(
            eventsDetected,
            litresSaved,
            kesSaved,
            successRate != null ? successRate : 99.9,
            avgResponseTime != null ? avgResponseTime : 0.0,
            avgVerificationTime != null ? avgVerificationTime : 0.0,
            unverifiedCount,
            LocalDateTime.now(),
            period
        ));
    }

    /**
     * GET /api/executive/dashboard
     * Full dashboard data including KPIs, recent events, and breakdowns.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardData> getDashboard(
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);

        // KPIs
        long eventsDetected = eventService.countOverfillEvents(since);
        long shutdownsTriggered = actuationService.countSuccessfulClosures(since);
        long litresSaved = actuationService.calculateLitresSaved(since);
        long kesSaved = actuationService.calculateKesSaved(since);
        Double successRate = actuationService.getSuccessRate(since);

        ExecutiveKPIs kpis = new ExecutiveKPIs(
            eventsDetected,
            shutdownsTriggered,
            litresSaved,
            kesSaved,
            successRate != null ? successRate : 100.0,
            hoursBack,
            LocalDateTime.now()
        );

        // Recent events
        List<EventEntity> recentEvents = eventService.getRecentEvents();
        List<EventSummary> eventSummaries = recentEvents.stream()
            .map(e -> new EventSummary(
                e.getEventId(),
                e.getEventType(),
                e.getSeverity(),
                e.getSiteId(),
                e.getTankId(),
                e.getSignalValue() != null ? e.getSignalValue().doubleValue() : 0.0,
                e.getCreatedAt(),
                e.getActuationTriggered(),
                e.getNotificationSent()
            ))
            .collect(Collectors.toList());

        // Breakdown by site
        List<Object[]> siteCounts = eventRepository.countBySiteSince(since);
        List<SiteBreakdown> siteBreakdowns = siteCounts.stream()
            .map(row -> new SiteBreakdown((String) row[0], ((Number) row[1]).longValue()))
            .collect(Collectors.toList());

        // Breakdown by severity
        List<Object[]> severityCounts = eventRepository.countBySeveritySince(since);
        Map<String, Long> severityBreakdown = severityCounts.stream()
            .collect(Collectors.toMap(
                row -> (String) row[0],
                row -> ((Number) row[1]).longValue()
            ));

        return ResponseEntity.ok(new DashboardData(
            kpis,
            eventSummaries,
            siteBreakdowns,
            severityBreakdown
        ));
    }

    // ── Supporting Endpoints ───────────────────────────────────────────────────

    /**
     * GET /api/executive/recent-events
     * Recent events for the live feed.
     */
    @GetMapping("/recent-events")
    public ResponseEntity<List<EventSummary>> getRecentEvents(
            @RequestParam(defaultValue = "10") int limit) {
        
        List<EventEntity> events = eventService.getRecentEvents(limit);
        List<EventSummary> summaries = events.stream()
            .map(e -> new EventSummary(
                e.getEventId(),
                e.getEventType(),
                e.getSeverity(),
                e.getSiteId(),
                e.getTankId(),
                e.getSignalValue() != null ? e.getSignalValue().doubleValue() : 0.0,
                e.getCreatedAt(),
                e.getActuationTriggered(),
                e.getNotificationSent()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(summaries);
    }

    /**
     * GET /api/executive/site/{siteId}
     * Get events for a specific site.
     */
    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<EventSummary>> getEventsBySite(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        List<EventEntity> events = eventService.getEventsBySite(siteId, since);
        
        List<EventSummary> summaries = events.stream()
            .map(e -> new EventSummary(
                e.getEventId(),
                e.getEventType(),
                e.getSeverity(),
                e.getSiteId(),
                e.getTankId(),
                e.getSignalValue() != null ? e.getSignalValue().doubleValue() : 0.0,
                e.getCreatedAt(),
                e.getActuationTriggered(),
                e.getNotificationSent()
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(summaries);
    }

    /**
     * GET /api/executive/thange-summary
     * Summary of Thange judgment impact - connects ML to business value.
     */
    @GetMapping("/thange-summary")
    public ResponseEntity<ThangeSummary> getThangeSummary(
            @RequestParam(defaultValue = "24") int hoursBack) {
        
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        
        long totalDetections = eventService.countOverfillEvents(since);
        long successfulInterventions = actuationService.countSuccessfulClosures(since);
        long litresSaved = actuationService.calculateLitresSaved(since);
        long kesSaved = actuationService.calculateKesSaved(since);
        
        return ResponseEntity.ok(new ThangeSummary(
            totalDetections,
            successfulInterventions,
            litresSaved,
            kesSaved,
            "ML-driven overfill detection + automated valve control",
            hoursBack
        ));
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────

    /**
     * V5 Executive Summary - matches frontend ExecutiveSummaryV5 type.
     * Used by /api/executive/summary and /api/executive/kpis endpoints.
     */
    public record ExecutiveSummaryV5(
        long overfillEventsPrevented,
        long estimatedLitresSaved,
        long estimatedKesExposureAvoided,
        double systemUptimePercent,
        double avgResponseTimeSec,
        double avgVerificationTimeSec,
        long unverifiedActuations,
        LocalDateTime lastUpdated,
        String period
    ) {}

    public record ExecutiveKPIs(
        long eventsDetected,
        long shutdownsTriggered,
        long litresSaved,
        long kesSaved,
        double successRatePercent,
        int periodHours,
        LocalDateTime asOf
    ) {}

    public record DashboardData(
        ExecutiveKPIs kpis,
        List<EventSummary> recentEvents,
        List<SiteBreakdown> siteBreakdown,
        Map<String, Long> severityBreakdown
    ) {}

    public record EventSummary(
        String eventId,
        String eventType,
        String severity,
        String siteId,
        String tankId,
        double tankLevelPct,
        LocalDateTime createdAt,
        boolean actuationTriggered,
        boolean notificationSent
    ) {}

    public record SiteBreakdown(
        String siteId,
        long eventCount
    ) {}

    public record ThangeSummary(
        long totalDetections,
        long successfulInterventions,
        long litresSaved,
        long kesSaved,
        String description,
        int periodHours
    ) {}
}
