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
