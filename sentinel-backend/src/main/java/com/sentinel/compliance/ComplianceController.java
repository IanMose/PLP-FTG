package com.sentinel.compliance;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for the Compliance Intelligence Module.
 *
 * Endpoints:
 *   GET /api/compliance/network       — network-wide OCS + per-site cards
 *   GET /api/compliance/sites/{siteId} — full site compliance breakdown
 *   GET /api/compliance/violations    — all open violations (optional ?siteId=)
 *   GET /api/compliance/trend         — 12-week trend (optional ?siteId=)
 */
@RestController
@RequestMapping("/api/compliance")
public class ComplianceController {

    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    /**
     * GET /api/compliance/network
     * Network-wide compliance overview — one card per KPC station + network averages.
     * Used by: dashboard KPI strip, compliance heat map, network OCS gauge.
     */
    @GetMapping("/network")
    public ResponseEntity<ComplianceNetworkSummaryDto> getNetworkSummary() {
        return ResponseEntity.ok(complianceService.getNetworkSummary());
    }

    /**
     * GET /api/compliance/sites/{siteId}
     * Full compliance breakdown for one site — all 4 domains, all 16 indicators.
     * Used by: site drill-down page.
     */
    @GetMapping("/sites/{siteId}")
    public ResponseEntity<ComplianceSummaryDto> getSiteSummary(@PathVariable String siteId) {
        return ResponseEntity.ok(complianceService.getSiteSummary(siteId));
    }

    /**
     * GET /api/compliance/violations?siteId=kpc-msa
     * Open compliance violations. siteId is optional — omit for all sites.
     * Used by: violations table widget.
     */
    @GetMapping("/violations")
    public ResponseEntity<List<ComplianceViolationDto>> getViolations(
            @RequestParam(required = false) String siteId) {
        return ResponseEntity.ok(complianceService.getViolations(siteId));
    }

    /**
     * GET /api/compliance/trend?siteId=kpc-nbi
     * 12-week compliance trend. siteId optional — omit for network average.
     * Used by: compliance trend chart.
     */
    @GetMapping("/trend")
    public ResponseEntity<List<ComplianceTrendPointDto>> getTrend(
            @RequestParam(required = false) String siteId) {
        return ResponseEntity.ok(complianceService.getTrend(siteId));
    }
}
