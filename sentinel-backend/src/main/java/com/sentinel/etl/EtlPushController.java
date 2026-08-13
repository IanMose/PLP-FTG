package com.sentinel.etl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.sentinel.site.SiteRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Receives a live ETL batch pushed by the Python pipeline running on GitHub Actions.
 *
 * POST /api/etl/push
 *   Header: X-ETL-Api-Key: <token>
 *   Body:   LiveBatchRecord JSON (same shape the pipeline writes to live_batch.json)
 *
 * Security: simple pre-shared API key checked against ETL_API_KEY env var.
 * The endpoint is listed in SecurityConfig.permitAll() so Spring Security
 * does not require a JWT — authentication is handled here via the header.
 */
@RestController
@RequestMapping("/api/etl")
@RequiredArgsConstructor
@Slf4j
public class EtlPushController {

    private final EtlReloadService etlReloadService;
    private final SiteRepository   siteRepository;

    @Value("${sentinel.etl.api-key:}")
    private String etlApiKey;

    @PostMapping("/push")
    public ResponseEntity<Map<String, Object>> receiveBatch(
            @RequestHeader(value = "X-ETL-Api-Key", required = false) String apiKey,
            @RequestBody LiveBatchRecord batch) {

        // ── API key check ─────────────────────────────────────────────────────
        if (etlApiKey == null || etlApiKey.isBlank()) {
            log.error("ETL push rejected: ETL_API_KEY is not configured on this server.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "ETL_API_KEY not configured"));
        }
        if (!etlApiKey.equals(apiKey)) {
            log.warn("ETL push rejected: invalid API key");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }

        if (batch == null || batch.getBatchId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing batch payload"));
        }

        log.info("ETL push received: batchId={} summary={}",
                batch.getBatchId(), batch.getSummary());

        try {
            Set<String> knownSiteIds = siteRepository.findAll().stream()
                    .map(s -> s.getSiteId().toLowerCase())
                    .collect(Collectors.toSet());

            var incidents   = etlReloadService.loadIncidents(batch.getIncidents(), batch.getBatchId(), knownSiteIds);
            var audits      = etlReloadService.loadAudits(batch.getAudits(), batch.getBatchId(), knownSiteIds);
            int envLoaded   = etlReloadService.loadEnvironmental(batch.getEnvironmental());

            log.info("ETL push processed: +{} incidents, +{} audits, +{} env readings",
                    incidents.size(), audits.size(), envLoaded);

            return ResponseEntity.ok(Map.of(
                    "batchId",      batch.getBatchId(),
                    "timestamp",    LocalDateTime.now().toString(),
                    "incidents",    incidents.size(),
                    "audits",       audits.size(),
                    "environmental", envLoaded
            ));

        } catch (Exception e) {
            log.error("ETL push processing failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
