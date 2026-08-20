package com.sentinel.analytics;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves pre-computed diagnostic JSON files produced by src/diagnostics.py.
 *
 * No DB tables are needed for diagnostics — they are computed artifacts, not
 * relational facts. The service reads the files on each request and returns
 * the raw JSON string; Spring serialises it directly to the response body.
 *
 * If a file doesn't exist yet (diagnostics not yet run), returns a structured
 * error payload so the frontend can show a loading state rather than crashing.
 */
@Service
@Slf4j
public class AnalyticsService {

    /** Reuses the same sentinel-dir config as EtlReloadService. */
    @Value("${sentinel.etl.sentinel-dir:../sentinel}")
    private String sentinelDir;

    private static final String WAREHOUSE = "data/warehouse";

    // ── File names ────────────────────────────────────────────────────────────
    private static final String SURVIVAL_FILE         = "survival_curve_data.json";
    private static final String CONTROL_CHART_FILE    = "control_chart_data.json";
    private static final String CORRELATION_FILE      = "correlation_data.json";
    private static final String FEATURE_IMPORT_FILE   = "feature_importance.json";
    private static final String ROI_REFERENCE_FILE    = "thange_kimeu_2025.json";
    private static final String ROI_SIMULATION_FILE   = "roi_simulation_result.json";
    private static final String ROI_REFERENCE_DIR     = "data/reference";

    // ── Public API ────────────────────────────────────────────────────────────

    public ResponseEntity<String> getSurvivalCurves() {
        return readJson(SURVIVAL_FILE);
    }

    public ResponseEntity<String> getPressureCharts() {
        return readJson(CONTROL_CHART_FILE);
    }

    public ResponseEntity<String> getCorrelation() {
        return readJson(CORRELATION_FILE);
    }

    public ResponseEntity<String> getFeatureImportance() {
        return readJson(FEATURE_IMPORT_FILE);
    }

    public ResponseEntity<String> getRoiReferenceCase() {
        // Read from data/reference/ not data/warehouse/
        Path filePath = Paths.get(sentinelDir, ROI_REFERENCE_DIR, ROI_REFERENCE_FILE).toAbsolutePath();
        if (!Files.exists(filePath)) {
            // Return a sensible default if file hasn't been generated yet
            String fallback = "{\"case_id\":\"thange_kimeu_2025\",\"case_name\":\"Kimeu & 3074 others v Kenya Pipeline Company Ltd & another\"," +
                "\"citation\":\"[2025] KEELC 5239 (KLR)\",\"incident_date\":\"2015-05-12\",\"judgment_date\":\"2025-07-11\"," +
                "\"liability_kpc_pct\":80,\"damages_kes\":2118831676,\"environmental_restoration_kes\":900000000," +
                "\"gross_award_kes\":3018831676,\"source_type\":\"COURT_RECORD\"," +
                "\"note\":\"Reference benchmark only. Never use as generic incident cost input.\"," +
                "\"default_assumptions\":[" +
                "{\"key\":\"interventionProbability\",\"label\":\"Intervention probability\",\"value\":0.70,\"unit\":\"0-1\",\"sourceType\":\"ESTIMATE\",\"editable\":true}," +
                "{\"key\":\"incidentExposureKes\",\"label\":\"Incident exposure — Critical\",\"value\":150000000,\"unit\":\"KES\",\"sourceType\":\"ESTIMATE\",\"editable\":true}," +
                "{\"key\":\"nHighRiskAlerts\",\"label\":\"High-risk alerts (period)\",\"value\":3,\"unit\":\"count\",\"sourceType\":\"PIPELINE_DATA\",\"editable\":true}," +
                "{\"key\":\"grossAwardKes\",\"label\":\"Kimeu v KPC gross award\",\"value\":3018831676,\"unit\":\"KES\",\"sourceType\":\"COURT_RECORD\",\"editable\":false}" +
                "]}";
            return ResponseEntity.ok().header("Content-Type", "application/json").body(fallback);
        }
        try {
            String content = Files.readString(filePath);
            return ResponseEntity.ok().header("Content-Type", "application/json").body(content);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("{\"error\":\"read_error\"}");
        }
    }

    public ResponseEntity<String> getRoiSimulationResult() {
        return readJson(ROI_SIMULATION_FILE);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private ResponseEntity<String> readJson(String filename) {
        Path filePath = Paths.get(sentinelDir, WAREHOUSE, filename).toAbsolutePath();

        if (!Files.exists(filePath)) {
            log.debug("Analytics: {} not found at {} — diagnostics not yet run", filename, filePath);
            String notFound = String.format(
                "{\"error\":\"not_ready\",\"message\":\"%s not found — run python -m src.diagnostics\",\"file\":\"%s\"}",
                filename, filePath
            );
            return ResponseEntity.status(503).body(notFound);
        }

        try {
            String content = Files.readString(filePath);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(content);
        } catch (IOException e) {
            log.error("Analytics: failed to read {}: {}", filePath, e.getMessage());
            String err = String.format(
                "{\"error\":\"read_error\",\"message\":\"%s\"}",
                e.getMessage().replace("\"", "'")
            );
            return ResponseEntity.internalServerError().body(err);
        }
    }
}
