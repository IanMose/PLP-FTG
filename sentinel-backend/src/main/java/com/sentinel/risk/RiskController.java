package com.sentinel.risk;

import com.sentinel.common.dto.SiteDetailDto;
import com.sentinel.common.dto.SiteRiskSummaryDto;
import com.sentinel.prediction.PredictionDto;
import com.sentinel.prediction.PredictionService;
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
    private final PredictionService predictionService;

    public RiskController(RiskService riskService, PredictionService predictionService) {
        this.riskService = riskService;
        this.predictionService = predictionService;
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

    /**
     * GET /api/sites/predictions — latest ML model probability per site.
     * Returns an empty array (not 404) if the model has not been trained yet.
     */
    @GetMapping("/predictions")
    public ResponseEntity<List<PredictionDto>> getPredictions() {
        return ResponseEntity.ok(predictionService.getLatestPredictions());
    }

    /**
     * GET /api/sites/{siteId}/prediction — latest prediction for a single site.
     * Returns 404 if no prediction exists for this site yet.
     */
    @GetMapping("/{siteId}/prediction")
    public ResponseEntity<PredictionDto> getSitePrediction(@PathVariable String siteId) {
        return predictionService.getLatestForSite(siteId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
