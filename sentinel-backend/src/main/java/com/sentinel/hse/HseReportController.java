package com.sentinel.hse;

import com.sentinel.alert.AlertRepository;
import com.sentinel.event.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * HseReportController — AI HSE Report API.
 *
 * Endpoints:
 *   POST   /api/hse-reports/generate/{eventId}      — generate (or retrieve) DRAFT report
 *   GET    /api/hse-reports                          — list all reports (most recent first)
 *   GET    /api/hse-reports/{reportId}               — get a single report with full JSON
 *   PATCH  /api/hse-reports/{reportId}/approve       — HSE manager approves → triggers ESG
 *   PATCH  /api/hse-reports/{reportId}/reject        — HSE manager rejects with notes
 *   GET    /api/hse-reports/stats                    — DRAFT/APPROVED/REJECTED counts
 */
@RestController
@RequestMapping("/api/hse-reports")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class HseReportController {

    private final HseReportService    hseReportService;
    private final HseReportRepository hseReportRepository;
    private final EsgMetricExtractor  esgMetricExtractor;
    private final AlertRepository     alertRepository;
    private final EventRepository     eventRepository;

    // ── Generate from event ───────────────────────────────────────────────────

    /**
     * POST /api/hse-reports/generate/{eventId}
     * Generates an AI HSE report for the given event. Idempotent — returns
     * existing DRAFT if one already exists for this event.
     */
    @PostMapping("/generate/{eventId}")
    public ResponseEntity<HseReportEntity> generate(@PathVariable String eventId) {
        log.info("HseReportController: generate request for eventId={}", eventId);
        try {
            HseReportEntity report = hseReportService.generateReport(eventId);
            return ResponseEntity.ok(report);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Generate from alert ───────────────────────────────────────────────────

    /**
     * POST /api/hse-reports/generate-from-alert/{alertId}
     *
     * Generates an AI HSE report from an alert ID. Finds the most recent
     * event for the alert's site and uses that as the report source.
     * This is the endpoint used by the embedded AI panel in the alert view.
     */
    @PostMapping("/generate-from-alert/{alertId}")
    public ResponseEntity<HseReportEntity> generateFromAlert(@PathVariable String alertId) {
        log.info("HseReportController: generate-from-alert request for alertId={}", alertId);

        // Find the alert
        var alertOpt = alertRepository.findById(alertId);
        if (alertOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var alert = alertOpt.get();

        // Try to find a recent event for this site first (preferred — more data)
        var events = eventRepository.findBySiteIdAndCreatedAtAfterOrderByCreatedAtDesc(
            alert.getSiteId(),
            java.time.LocalDateTime.now().minusDays(90)
        );

        if (!events.isEmpty()) {
            try {
                HseReportEntity report = hseReportService.generateReport(events.get(0).getEventId());
                return ResponseEntity.ok(report);
            } catch (IllegalArgumentException ex) {
                log.warn("HseReportController: event-based generation failed for alertId={}, falling back to alert-based", alertId);
            }
        }

        // No events found — generate directly from alert data
        try {
            HseReportEntity report = hseReportService.generateFromAlert(alert);
            return ResponseEntity.ok(report);
        } catch (Exception ex) {
            log.error("HseReportController: alert-based generation failed for alertId={}: {}", alertId, ex.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── List ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/hse-reports?status=DRAFT
     *
     * Returns all reports ordered by generatedAt DESC.
     * Optional ?status filter: DRAFT, APPROVED, REJECTED
     */
    @GetMapping
    public ResponseEntity<List<HseReportEntity>> list(
            @RequestParam(required = false) String status) {

        List<HseReportEntity> reports = status != null && !status.isBlank()
            ? hseReportRepository.findByStatusOrderByGeneratedAtDesc(status.toUpperCase())
            : hseReportRepository.findAllByOrderByGeneratedAtDesc();

        return ResponseEntity.ok(reports);
    }

    // ── Get single ────────────────────────────────────────────────────────────

    /**
     * GET /api/hse-reports/{reportId}
     * Returns full report including report_json.
     */
    @GetMapping("/{reportId}")
    public ResponseEntity<HseReportEntity> getReport(@PathVariable String reportId) {
        return hseReportRepository.findById(reportId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    /**
     * PATCH /api/hse-reports/{reportId}/approve
     *
     * Body: { "reviewedBy": "Jane Mwangi", "notes": "Verified field report." }
     *
     * Sets status = APPROVED, records reviewer, triggers ESG metric extraction.
     */
    @PatchMapping("/{reportId}/approve")
    public ResponseEntity<HseReportEntity> approve(
            @PathVariable String reportId,
            @RequestBody ApprovalRequest request) {

        if (request.reviewedBy() == null || request.reviewedBy().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            HseReportEntity approved = hseReportService.approveReport(
                reportId, request.reviewedBy(), request.notes());

            // Trigger ESG promotion immediately on approval
            try {
                esgMetricExtractor.promoteReport(approved);
                log.info("HseReportController: ESG metrics promoted for report {}", reportId);
            } catch (Exception ex) {
                // ESG promotion failure must never block the approval response
                log.warn("HseReportController: ESG promotion failed for report {}: {}", reportId, ex.getMessage());
            }

            return ResponseEntity.ok(approved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    /**
     * PATCH /api/hse-reports/{reportId}/reject
     *
     * Body: { "reviewedBy": "Jane Mwangi", "notes": "Root cause section incomplete." }
     *
     * Notes are required on rejection — the HSE manager must state why.
     */
    @PatchMapping("/{reportId}/reject")
    public ResponseEntity<HseReportEntity> reject(
            @PathVariable String reportId,
            @RequestBody ApprovalRequest request) {

        if (request.reviewedBy() == null || request.reviewedBy().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.notes() == null || request.notes().isBlank()) {
            return ResponseEntity.badRequest().build();  // notes required on rejection
        }

        try {
            HseReportEntity rejected = hseReportService.rejectReport(
                reportId, request.reviewedBy(), request.notes());
            return ResponseEntity.ok(rejected);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/hse-reports/stats
     * Returns DRAFT / APPROVED / REJECTED counts.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> stats() {
        return ResponseEntity.ok(Map.of(
            "draft",    hseReportRepository.countByStatus(HseReportEntity.STATUS_DRAFT),
            "approved", hseReportRepository.countByStatus(HseReportEntity.STATUS_APPROVED),
            "rejected", hseReportRepository.countByStatus(HseReportEntity.STATUS_REJECTED),
            "total",    hseReportRepository.count()
        ));
    }

    // ── Request DTOs ──────────────────────────────────────────────────────────

    public record ApprovalRequest(String reviewedBy, String notes) {}
}
