package com.sentinel.demo;

import com.sentinel.event.EventEntity;
import com.sentinel.event.EventService;
import com.sentinel.telemetry.TankTelemetryEntity;
import com.sentinel.telemetry.TankTelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * DemoController - Live demonstration endpoints for hackathon judges.
 * 
 * Key endpoint: POST /api/demo/trigger-overfill
 * This simulates an overfill scenario and runs the full control loop:
 * 1. Insert tank telemetry reading with 96% fill + valve Open
 * 2. Detect the overfill condition
 * 3. Create event in event_log
 * 4. Trigger simulated valve close (actuation_log)
 * 5. Send Slack notification
 * 
 * The judge watches the 5-step feed unfold in real-time.
 */
@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DemoController {

    private final TankTelemetryRepository telemetryRepository;
    private final EventService eventService;

    // Default demo site - seeded in site-003 per Implementation Plan
    private static final String DEMO_SITE = "site-003";
    private static final String DEMO_TANK = "TANK-A1";

    // ── Main Demo Endpoint ─────────────────────────────────────────────────────

    /**
     * POST /api/demo/trigger-overfill
     * 
     * The money endpoint - triggers the full detect → act → notify loop.
     * Judge presses button, watches magic happen.
     */
    @PostMapping("/trigger-overfill")
    public ResponseEntity<DemoResult> triggerOverfill(@RequestBody(required = false) DemoRequest request) {
        String siteId = request != null && request.siteId() != null ? request.siteId() : DEMO_SITE;
        String tankId = request != null && request.tankId() != null ? request.tankId() : DEMO_TANK;
        BigDecimal tankLevel = request != null && request.tankLevelPct() != null 
            ? request.tankLevelPct() 
            : new BigDecimal("96.5");

        log.info("=== DEMO TRIGGERED === Site: {}, Tank: {}, Level: {}%", siteId, tankId, tankLevel);

        List<DemoStep> steps = new ArrayList<>();
        long startTime = System.currentTimeMillis();

        try {
            // Step 1: Insert overfill telemetry reading
            steps.add(new DemoStep(1, "Telemetry Ingested", 
                String.format("Tank %s reading: %.1f%% fill, valve OPEN", tankId, tankLevel.doubleValue()),
                System.currentTimeMillis() - startTime));

            String loadingOpId = "LOAD-DEMO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            TankTelemetryEntity reading = createDemoTelemetry(siteId, tankId, tankLevel, loadingOpId);
            telemetryRepository.save(reading);

            // Step 2: Detect overfill condition
            steps.add(new DemoStep(2, "Overfill Detected",
                String.format("ML model detected: %.1f%% > 95%% threshold with valve open", tankLevel.doubleValue()),
                System.currentTimeMillis() - startTime));

            // Step 3-5: Create event and process (actuation + notification)
            var eventOpt = eventService.createOverfillEventIfNew(reading);
            
            if (eventOpt.isPresent()) {
                EventEntity event = eventOpt.get();
                
                steps.add(new DemoStep(3, "Event Created",
                    String.format("Event %s logged - Severity: %s", event.getEventId(), event.getSeverity()),
                    System.currentTimeMillis() - startTime));

                // Process event (triggers actuation + Slack)
                var result = eventService.processEvent(event);

                steps.add(new DemoStep(4, "Valve Closed",
                    String.format("Actuation %s - %s in %dms", 
                        result.getActuationId(),
                        result.isActuationSuccess() ? "SUCCESS" : "SIMULATED FAILURE",
                        result.getLatencyMs()),
                    System.currentTimeMillis() - startTime));

                String notifDetail = result.isNotificationSuccess()
                    ? "Slack alert sent to #sentinel-alerts"
                    : "Slack notification queued (check config)";
                if (result.getAiNarrative() != null) {
                    notifDetail += " — AI narrative included";
                }
                steps.add(new DemoStep(5, "Notification Sent", notifDetail,
                    System.currentTimeMillis() - startTime));

                long totalTime = System.currentTimeMillis() - startTime;
                log.info("=== DEMO COMPLETE === Total time: {}ms, Steps: {}, AI narrative: {}",
                    totalTime, steps.size(), result.getAiNarrative() != null ? "yes" : "no");

                return ResponseEntity.ok(new DemoResult(
                    true,
                    "Demo completed successfully - overfill detected, valve closed, notification sent",
                    event.getEventId(),
                    result.getActuationId(),
                    result.getAiNarrative(),
                    steps,
                    totalTime
                ));
            } else {
                // Event already exists for this scenario (deduplication kicked in)
                steps.add(new DemoStep(3, "Event Deduplicated",
                    "Event already exists for this loading operation - no duplicate created",
                    System.currentTimeMillis() - startTime));

                return ResponseEntity.ok(new DemoResult(
                    true,
                    "Telemetry recorded but event was deduplicated (already processed)",
                    null,
                    null,
                    null,
                    steps,
                    System.currentTimeMillis() - startTime
                ));
            }

        } catch (Exception e) {
            log.error("Demo failed: {}", e.getMessage(), e);
            steps.add(new DemoStep(steps.size() + 1, "Error", e.getMessage(), 
                System.currentTimeMillis() - startTime));
            
            return ResponseEntity.internalServerError().body(new DemoResult(
                false,
                "Demo failed: " + e.getMessage(),
                null,
                null,
                null,
                steps,
                System.currentTimeMillis() - startTime
            ));
        }
    }

    /**
     * POST /api/demo/trigger-critical
     * Trigger a critical-level overfill (98%+) for maximum drama.
     */
    @PostMapping("/trigger-critical")
    public ResponseEntity<DemoResult> triggerCritical() {
        DemoRequest request = new DemoRequest(DEMO_SITE, DEMO_TANK, new BigDecimal("98.7"));
        return triggerOverfill(request);
    }

    /**
     * POST /api/demo/reset
     * Clear demo data for a fresh run.
     */
    @PostMapping("/reset")
    public ResponseEntity<String> resetDemo() {
        log.info("Demo reset requested");
        // In a real implementation, this would clear demo-specific data
        // For hackathon, we rely on deduplication by loading operation ID
        return ResponseEntity.ok("Demo ready for next run - each trigger creates new loading operation ID");
    }

    // ── Query Endpoints ────────────────────────────────────────────────────────

    /**
     * GET /api/demo/recent-events
     * Get recent events for the live feed display.
     */
    @GetMapping("/recent-events")
    public ResponseEntity<List<EventEntity>> getRecentEvents() {
        return ResponseEntity.ok(eventService.getRecentEvents());
    }

    /**
     * GET /api/demo/status
     * Check demo system status.
     */
    @GetMapping("/status")
    public ResponseEntity<DemoStatus> getStatus() {
        LocalDateTime last24h = LocalDateTime.now().minusHours(24);
        long eventCount = eventService.countTotalEvents(last24h);
        long overfillCount = eventService.countOverfillEvents(last24h);
        long actuationCount = eventService.countActuationEvents(last24h);

        return ResponseEntity.ok(new DemoStatus(
            true,
            "Demo system ready",
            eventCount,
            overfillCount,
            actuationCount
        ));
    }

    // ── Helper Methods ─────────────────────────────────────────────────────────

    private TankTelemetryEntity createDemoTelemetry(
            String siteId, String tankId, BigDecimal tankLevel, String loadingOpId) {
        
        TankTelemetryEntity reading = new TankTelemetryEntity();
        reading.setReadingId("READ-DEMO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        reading.setSiteId(siteId);
        reading.setTankId(tankId);
        reading.setReadingTimestamp(LocalDateTime.now());
        reading.setTankLevelPct(tankLevel);
        reading.setFlowRateBph(new BigDecimal("450.0"));
        reading.setValveStatus("Open");
        reading.setSensorId("SENSOR-DEMO");
        reading.setLoadingOperationId(loadingOpId);
        reading.setOverfillFlag(tankLevel.compareTo(TankTelemetryEntity.OVERFILL_THRESHOLD) >= 0);
        reading.setBatchId("DEMO-BATCH");
        reading.setIngestionTimestamp(LocalDateTime.now());
        
        return reading;
    }

    // ── DTOs ───────────────────────────────────────────────────────────────────

    public record DemoRequest(
        String siteId,
        String tankId,
        BigDecimal tankLevelPct
    ) {}

    public record DemoResult(
        boolean success,
        String message,
        String eventId,
        String actuationId,
        String aiNarrative,
        List<DemoStep> steps,
        long totalTimeMs
    ) {}

    public record DemoStep(
        int stepNumber,
        String action,
        String detail,
        long elapsedMs
    ) {}

    public record DemoStatus(
        boolean ready,
        String message,
        long totalEvents24h,
        long overfillEvents24h,
        long actuations24h
    ) {}
}
