package com.sentinel.analytics;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Analytics endpoints — serve pre-computed diagnostic JSON to the frontend.
 *
 * All endpoints return raw JSON strings (application/json) produced by
 * src/diagnostics.py and src/predict.py. No additional serialisation happens;
 * the files are written by Python and served verbatim.
 *
 * Endpoints:
 *   GET /api/analytics/survival-curves      → survival_curve_data.json
 *   GET /api/analytics/pressure-charts      → control_chart_data.json
 *   GET /api/analytics/correlation          → correlation_data.json
 *   GET /api/analytics/feature-importance   → feature_importance.json
 *
 * Returns 503 if the file doesn't exist yet (diagnostics not yet run).
 * Returns 500 if the file exists but cannot be read.
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Kaplan-Meier time-to-closure survival curves:
     * fleet vs high-risk sites, medians, and closure rates.
     */
    @GetMapping("/survival-curves")
    public ResponseEntity<String> getSurvivalCurves() {
        return analyticsService.getSurvivalCurves();
    }

    /**
     * EWMA pressure control charts per site:
     * readings, UCL/LCL bands, drift flags, and lead times before spikes.
     */
    @GetMapping("/pressure-charts")
    public ResponseEntity<String> getPressureCharts() {
        return analyticsService.getPressureCharts();
    }

    /**
     * Rejection rate vs incident count Pearson correlation:
     * scatter points per site and interpretation.
     */
    @GetMapping("/correlation")
    public ResponseEntity<String> getCorrelation() {
        return analyticsService.getCorrelation();
    }

    /**
     * Logistic regression feature importances:
     * standardised coefficients per feature from the trained model.
     */
    @GetMapping("/feature-importance")
    public ResponseEntity<String> getFeatureImportance() {
        return analyticsService.getFeatureImportance();
    }
}
