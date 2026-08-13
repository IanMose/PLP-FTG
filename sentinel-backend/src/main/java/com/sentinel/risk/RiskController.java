package com.sentinel.risk;

import com.sentinel.common.dto.SiteDetailDto;
import com.sentinel.common.dto.SiteRiskSummaryDto;
import com.sentinel.risk.dto.RiskSimulateRequestDto;
import com.sentinel.risk.dto.RiskSimulateResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for risk scoring and site operations.
 * Exposes per-site risk scores for the frontend heatmap and site drill-downs.
 */
@RestController
@RequestMapping("/api/sites")
public class RiskController {

    private final RiskService riskService;

    public RiskController(RiskService riskService) {
        this.riskService = riskService;
    }

    /** GET /api/sites/risk-summary — for the Risk Heatmap view */
    @GetMapping("/risk-summary")
    public ResponseEntity<List<SiteRiskSummaryDto>> getRiskSummary() {
        return ResponseEntity.ok(riskService.computeRiskSummary());
    }

    /** GET /api/sites/{siteId} — for the Site Drill-down view */
    @GetMapping("/{siteId}")
    public ResponseEntity<SiteDetailDto> getSiteDetail(@PathVariable String siteId) {
        return ResponseEntity.ok(riskService.getSiteDetail(siteId));
    }

    /** POST /api/sites/{siteId}/simulate — what-if risk simulation, no persistence */
    @PostMapping("/{siteId}/simulate")
    public ResponseEntity<RiskSimulateResponseDto> simulate(
            @PathVariable String siteId,
            @RequestBody @Valid RiskSimulateRequestDto request) {
        return ResponseEntity.ok(riskService.simulateScore(siteId, request));
    }
}
