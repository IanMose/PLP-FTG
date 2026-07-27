package com.sentinel.etl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinel.site.AuditEntity;
import com.sentinel.site.AuditRepository;
import com.sentinel.site.IncidentEntity;
import com.sentinel.site.IncidentRepository;
import com.sentinel.site.SiteRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

/**
 * Two responsibilities:
 *
 * 1. AUTO-START: On application startup, launches run_live.sh as a background
 *    process so the Python ETL runs every minute without any manual step.
 *    The process is stopped cleanly when Spring Boot shuts down.
 *
 * 2. RELOAD: Polls live_batch.json every minute and upserts new incidents
 *    and audits into the database. Skips batches already processed (idempotent).
 *
 * Configuration (application.yml):
 *   sentinel.etl.live-batch-path   – path to live_batch.json
 *   sentinel.etl.sentinel-dir      – path to the sentinel/ Python project root
 *   sentinel.etl.enabled           – set false to disable both
 *   sentinel.etl.poll-interval-ms  – reload frequency (default 60 000 ms)
 *   sentinel.etl.rows-per-cycle    – rows generated per ETL run (default 50)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EtlReloadService {

    private final IncidentRepository incidentRepository;
    private final AuditRepository    auditRepository;
    private final SiteRepository     siteRepository;
    private final ObjectMapper       objectMapper;

    @Value("${sentinel.etl.live-batch-path:../sentinel/data/warehouse/live_batch.json}")
    private String liveBatchPath;

    @Value("${sentinel.etl.sentinel-dir:../sentinel}")
    private String sentinelDir;

    @Value("${sentinel.etl.enabled:true}")
    private boolean enabled;

    @Value("${sentinel.etl.rows-per-cycle:50}")
    private int rowsPerCycle;

    private String  lastProcessedBatchId = null;
    private Process etlProcess           = null;

    // ── Auto-start on boot ────────────────────────────────────────────────────

    /**
     * Called automatically by Spring after the bean is wired up.
     * Launches run_live.sh in the background — no manual cd or script needed.
     */
    @PostConstruct
    public void startEtlLoop() {
        if (!enabled) {
            log.info("ETL auto-start disabled (sentinel.etl.enabled=false)");
            return;
        }

        File dir    = new File(sentinelDir).getAbsoluteFile();
        File script = new File(dir, "run_live.sh");

        if (!dir.isDirectory()) {
            log.warn("ETL auto-start: sentinel dir not found at '{}' — run run_live.sh manually.",
                    dir.getAbsolutePath());
            return;
        }
        if (!script.exists()) {
            log.warn("ETL auto-start: run_live.sh not found at '{}' — run manually.",
                    script.getAbsolutePath());
            return;
        }

        try {
            script.setExecutable(true);

            File logFile = new File(dir, "logs/etl.log");
            logFile.getParentFile().mkdirs();

            ProcessBuilder pb = new ProcessBuilder("/bin/bash", script.getAbsolutePath());
            pb.directory(dir);
            pb.environment().put("ROWS",     String.valueOf(rowsPerCycle));
            pb.environment().put("INTERVAL", "60");
            pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile));
            pb.redirectError(ProcessBuilder.Redirect.appendTo(logFile));

            etlProcess = pb.start();
            log.info("ETL auto-start: run_live.sh started (pid={}, rows={}, log={})",
                    etlProcess.pid(), rowsPerCycle, logFile.getAbsolutePath());

        } catch (IOException e) {
            log.error("ETL auto-start failed: {} — run manually: cd {} && ./run_live.sh",
                    e.getMessage(), dir.getAbsolutePath());
        }
    }

    /** Stops the background ETL process when Spring Boot shuts down. */
    @PreDestroy
    public void stopEtlLoop() {
        if (etlProcess != null && etlProcess.isAlive()) {
            log.info("ETL shutdown: stopping run_live.sh (pid={})", etlProcess.pid());
            etlProcess.destroy();
        }
    }

    // ── Scheduled reload ──────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${sentinel.etl.poll-interval-ms:60000}", initialDelay = 5000)
    @Transactional
    public void reload() {
        if (!enabled) return;

        File batchFile = new File(liveBatchPath);
        if (!batchFile.exists()) {
            log.debug("ETL reload: live_batch.json not found at {} — skipping", liveBatchPath);
            return;
        }

        try {
            LiveBatchRecord batch = objectMapper.readValue(batchFile, LiveBatchRecord.class);

            if (batch.getBatchId() != null && batch.getBatchId().equals(lastProcessedBatchId)) {
                log.debug("ETL reload: batch {} already processed — skipping", batch.getBatchId());
                return;
            }

            int incLoaded = loadIncidents(batch.getIncidents(), batch.getBatchId());
            int audLoaded = loadAudits(batch.getAudits(), batch.getBatchId());

            lastProcessedBatchId = batch.getBatchId();

            log.info("ETL reload [{}]: +{} incidents, +{} audits | summary={}",
                    shortId(batch.getBatchId()), incLoaded, audLoaded, batch.getSummary());

        } catch (Exception e) {
            log.error("ETL reload failed: {}", e.getMessage(), e);
        }
    }

    // ── Incidents ─────────────────────────────────────────────────────────────

    private int loadIncidents(List<Map<String, Object>> records, String batchId) {
        if (records == null || records.isEmpty()) return 0;
        int count = 0;
        for (Map<String, Object> r : records) {
            String id = str(r, "incident_id");
            if (id == null || id.isBlank()) continue;
            if (incidentRepository.existsById(id)) continue;

            String siteId = normaliseSiteId(str(r, "site"));
            if (siteId == null || !siteRepository.existsById(siteId)) {
                log.debug("ETL: skipping incident {} — unknown site '{}'", id, str(r, "site"));
                continue;
            }

            IncidentEntity e = new IncidentEntity();
            e.setIncidentId(id);
            e.setSiteId(siteId);
            e.setIncidentDate(parseDateTime(str(r, "incident_date")));
            e.setSeverity(str(r, "severity"));
            e.setDescription(str(r, "description"));
            e.setComplianceScore(toInt(r.get("compliance_score")));
            e.setStatus(str(r, "status"));
            e.setDecision(str(r, "decision"));
            e.setDecisionReason(str(r, "decision_reason"));
            e.setBatchId(batchId);
            e.setIngestionTimestamp(LocalDateTime.now());
            incidentRepository.save(e);
            count++;
        }
        return count;
    }

    // ── Audits ────────────────────────────────────────────────────────────────

    private int loadAudits(List<Map<String, Object>> records, String batchId) {
        if (records == null || records.isEmpty()) return 0;
        int count = 0;
        for (Map<String, Object> r : records) {
            String id = str(r, "audit_id");
            if (id == null || id.isBlank()) continue;
            if (auditRepository.existsById(id)) continue;

            String siteId = normaliseSiteId(str(r, "site"));
            if (siteId == null || !siteRepository.existsById(siteId)) {
                log.debug("ETL: skipping audit {} — unknown site '{}'", id, str(r, "site"));
                continue;
            }

            AuditEntity e = new AuditEntity();
            e.setAuditId(id);
            e.setSiteId(siteId);
            e.setInspectionDate(parseDateTime(str(r, "inspection_date")));
            e.setClosedDate(parseDateTime(str(r, "closed_date")));
            e.setAuditor(str(r, "auditor"));
            e.setFindings(str(r, "findings_detail"));
            e.setComplianceScore(toInt(r.get("compliance_score")));
            e.setFollowUpRequired(Boolean.TRUE.equals(r.get("follow_up_required")));
            e.setDecision(str(r, "decision"));
            e.setDecisionReason(str(r, "decision_reason"));
            e.setBatchId(batchId);
            e.setIngestionTimestamp(LocalDateTime.now());
            auditRepository.save(e);
            count++;
        }
        return count;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** "SITE-001" → "site-001" — matches the lowercase keys in V2__seed_data.sql */
    private String normaliseSiteId(String raw) {
        if (raw == null) return null;
        return raw.toLowerCase();
    }

    private static final DateTimeFormatter[] DATE_FORMATS = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
    };

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try {
                if (raw.length() == 10) {   // date-only → midnight
                    return LocalDateTime.parse(raw + "T00:00:00",
                            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
                }
                return LocalDateTime.parse(raw, fmt);
            } catch (DateTimeParseException ignored) { }
        }
        log.debug("ETL: could not parse date '{}' — storing null", raw);
        return null;
    }

    private String str(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v == null ? null : v.toString().trim();
    }

    private Integer toInt(Object v) {
        if (v == null) return null;
        try { return (int) Double.parseDouble(v.toString()); }
        catch (NumberFormatException e) { return null; }
    }

    private String shortId(String id) {
        return id == null ? "null" : id.substring(0, Math.min(8, id.length()));
    }
}
