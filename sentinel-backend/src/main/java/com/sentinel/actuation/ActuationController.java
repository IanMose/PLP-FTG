package com.sentinel.actuation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * REST API for valve actuation commands.
 * Provides endpoints for manual valve control and actuation history.
 */
@RestController
@RequestMapping("/api/actuate")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ActuationController {

    private final ActuationService actuationService;

    // ── Valve Control Endpoints ────────────────────────────────────────────────

    /**
     * POST /api/actuate/close-valve
     * Manually close a valve for a specific tank.
     * Requires OPERATOR, HSE_OFFICER, or ADMIN role.
     */
    @PostMapping("/close-valve")
    @PreAuthorize("hasAnyRole('OPERATOR', 'HSE_OFFICER', 'HSE_MANAGER', 'ADMIN')")
    public ResponseEntity<ActuationResponse> closeValve(@RequestBody CloseValveRequest request) {
        log.info("Manual valve close request for tank {} at {} by {}", 
            request.tankId(), request.siteId(), request.triggeredBy());
        
        ActuationService.ActuationResult result = actuationService.closeValveDirect(
            request.siteId(),
            request.tankId(),
            request.triggeredBy() != null ? request.triggeredBy() : "ManualRequest"
        );
        
        return ResponseEntity.ok(ActuationResponse.from(result));
    }

    /**
     * POST /api/actuate/emergency-stop
     * Emergency stop - highest priority valve closure.
     * Requires OPERATOR, HSE_OFFICER, or ADMIN role.
     */
    @PostMapping("/emergency-stop")
    @PreAuthorize("hasAnyRole('OPERATOR', 'HSE_OFFICER', 'HSE_MANAGER', 'ADMIN')")
    public ResponseEntity<ActuationResponse> emergencyStop(@RequestBody CloseValveRequest request) {
        log.warn("EMERGENCY STOP request for tank {} at {} by {}", 
            request.tankId(), request.siteId(), request.triggeredBy());
        
        ActuationService.ActuationResult result = actuationService.emergencyStop(
            request.siteId(),
            request.tankId(),
            request.triggeredBy() != null ? request.triggeredBy() : "EmergencyRequest"
        );
        
        return ResponseEntity.ok(ActuationResponse.from(result));
    }

    // ── Query Endpoints ────────────────────────────────────────────────────────

    /**
     * GET /api/actuate/{actuationId}
     * Get details of a specific actuation.
     */
    @GetMapping("/{actuationId}")
    public ResponseEntity<ActuationLogEntity> getActuation(@PathVariable String actuationId) {
        return actuationService.getActuation(actuationId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/actuate/by-event/{eventId}
     * Get actuation for a specific event.
     */
    @GetMapping("/by-event/{eventId}")
    public ResponseEntity<ActuationLogEntity> getActuationByEvent(@PathVariable String eventId) {
        return actuationService.getActuationByEvent(eventId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/actuate/recent
     * Get recent actuations for the live feed.
     */
    @GetMapping("/recent")
    public ResponseEntity<List<ActuationLogEntity>> getRecentActuations() {
        return ResponseEntity.ok(actuationService.getRecentActuations());
    }

    /**
     * GET /api/actuate/site/{siteId}
     * Get actuations for a specific site.
     */
    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<ActuationLogEntity>> getActuationsBySite(
            @PathVariable String siteId,
            @RequestParam(defaultValue = "24") int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        return ResponseEntity.ok(actuationService.getActuationsBySite(siteId, since));
    }

    // ── Analytics Endpoints (for dashboard) ────────────────────────────────────

    /**
     * GET /api/actuate/stats
     * Get actuation statistics for dashboard.
     */
    @GetMapping("/stats")
    public ResponseEntity<ActuationStats> getStats(
            @RequestParam(defaultValue = "24") int hoursBack) {
        LocalDateTime since = LocalDateTime.now().minusHours(hoursBack);
        
        long successfulClosures = actuationService.countSuccessfulClosures(since);
        Double successRate = actuationService.getSuccessRate(since);
        Double avgLatency = actuationService.getAverageLatency(since);
        long litresSaved = actuationService.calculateLitresSaved(since);
        long kesSaved = actuationService.calculateKesSaved(since);
        
        return ResponseEntity.ok(new ActuationStats(
            successfulClosures,
            successRate != null ? successRate : 0.0,
            avgLatency != null ? avgLatency : 0.0,
            litresSaved,
            kesSaved
        ));
    }

    // ── Request/Response DTOs ──────────────────────────────────────────────────

    public record CloseValveRequest(
        String siteId,
        String tankId,
        String triggeredBy
    ) {}

    public record ActuationResponse(
        String actuationId,
        boolean success,
        String status,
        int latencyMs,
        String errorMessage,
        String message
    ) {
        public static ActuationResponse from(ActuationService.ActuationResult result) {
            String message = result.success() 
                ? "Valve close command executed successfully (simulated)"
                : "Valve close command failed: " + result.errorMessage();
            
            return new ActuationResponse(
                result.actuationId(),
                result.success(),
                result.status(),
                result.latencyMs(),
                result.errorMessage(),
                message
            );
        }
    }

    public record ActuationStats(
        long shutdownsTriggered,
        double successRatePercent,
        double averageLatencyMs,
        long litresSaved,
        long kesSaved
    ) {}
}
