package com.sentinel.hse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * EsgMetricExtractor — ESG Promotion Layer.
 *
 * When an HSE report is APPROVED, this service extracts structured ESG metrics
 * from the report JSON and persists them as EsgMetricEntity records.
 *
 * These records are then surfaced in the ESG Report dashboard alongside the
 * live operational metrics from EsgController.
 *
 * ESG pillars covered:
 *   E — Environmental: spill prevention, release status, environmental risk
 *   S — Social: community safety, worker safety, community impact
 *   G — Governance: CAPA status, audit trail, response time, data quality
 *
 * This is a one-way, append-only promotion — existing ESG records are never
 * modified. Each approved report contributes one set of records.
 *
 * Human-in-the-loop guarantee: only APPROVED reports are promoted.
 * DRAFT and REJECTED reports have zero ESG impact.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EsgMetricExtractor {

    private final EsgMetricRepository esgMetricRepository;
    private final HseReportRepository hseReportRepository;
    private final ObjectMapper objectMapper;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Promote an approved HSE report into ESG metric records.
     * Called by HseReportController immediately after approval.
     * Safe to call multiple times — idempotent via esgPromoted flag check.
     */
    @Transactional
    public void promoteReport(HseReportEntity report) {
        if (!HseReportEntity.STATUS_APPROVED.equals(report.getStatus())) {
            log.warn("EsgMetricExtractor: cannot promote non-APPROVED report {}", report.getReportId());
            return;
        }
        if (report.isEsgPromoted()) {
            log.info("EsgMetricExtractor: report {} already promoted — skipping", report.getReportId());
            return;
        }

        List<EsgMetricEntity> metrics = extractMetrics(report);
        esgMetricRepository.saveAll(metrics);

        report.setEsgPromoted(true);
        hseReportRepository.save(report);

        log.info("EsgMetricExtractor: promoted {} metrics from report {}",
            metrics.size(), report.getReportId());
    }

    // ── Metric Extraction ─────────────────────────────────────────────────────

    private List<EsgMetricEntity> extractMetrics(HseReportEntity report) {
        List<EsgMetricEntity> metrics = new ArrayList<>();
        String period = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String source = "HSE Report " + report.getReportId();

        // ── E: Environmental ──────────────────────────────────────────────────

        // Did a spill occur? Extract from environmentalImpactAssessment section
        boolean confirmedRelease = extractConfirmedRelease(report.getReportJson());
        metrics.add(EsgMetricEntity.of(
            "Environmental",
            "Confirmed environmental releases",
            confirmedRelease ? "1" : "0",
            "count",
            period,
            source,
            confirmedRelease ? "SYSTEM_GENERATED" : "SYSTEM_GENERATED",
            report.getReportId()
        ));

        // Spill incidents prevented (if actuation triggered, we prevented the spill)
        boolean spillPrevented = isSpillPrevented(report.getReportJson());
        metrics.add(EsgMetricEntity.of(
            "Environmental",
            "Spill incidents prevented",
            spillPrevented ? "1" : "0",
            "count",
            period,
            source,
            "SYSTEM_GENERATED",
            report.getReportId()
        ));

        // Incident severity
        metrics.add(EsgMetricEntity.of(
            "Environmental",
            "Environmental incident severity",
            report.getSeverity() != null ? report.getSeverity() : "Unknown",
            "classification",
            period,
            source,
            "SYSTEM_GENERATED",
            report.getReportId()
        ));

        // ── S: Social ─────────────────────────────────────────────────────────

        // Critical safety incidents
        metrics.add(EsgMetricEntity.of(
            "Social",
            "Critical safety incidents",
            isCritical(report.getSeverity()) ? "1" : "0",
            "count",
            period,
            source,
            "SYSTEM_GENERATED",
            report.getReportId()
        ));

        // Community impact confirmed
        metrics.add(EsgMetricEntity.of(
            "Social",
            "Confirmed community impact incidents",
            "0",   // never assume — only confirmed reports count
            "count",
            period,
            source,
            "PENDING_VERIFICATION",
            report.getReportId()
        ));

        // High-risk site event (Sinai/Thange class)
        boolean highRisk = "site-003".equals(report.getSiteId())
                        || "site-006".equals(report.getSiteId());
        metrics.add(EsgMetricEntity.of(
            "Social",
            "High-risk site incidents (Sinai/Thange class)",
            highRisk ? "1" : "0",
            "count",
            period,
            source,
            "SYSTEM_GENERATED",
            report.getReportId()
        ));

        // ── G: Governance ─────────────────────────────────────────────────────

        // CAPAs raised from this report
        int capaCount = extractCapaCount(report.getReportJson());
        metrics.add(EsgMetricEntity.of(
            "Governance",
            "CAPAs raised from HSE reports",
            String.valueOf(capaCount),
            "count",
            period,
            source,
            "CALCULATED",
            report.getReportId()
        ));

        // Report approved (proves governance process was followed)
        metrics.add(EsgMetricEntity.of(
            "Governance",
            "HSE reports approved by HSE professional",
            "1",
            "count",
            period,
            source,
            "SYSTEM_GENERATED",
            report.getReportId()
        ));

        // Reviewer name (audit trail)
        metrics.add(EsgMetricEntity.of(
            "Governance",
            "HSE report reviewer",
            report.getReviewedBy() != null ? report.getReviewedBy() : "Not recorded",
            "name",
            period,
            source,
            "HUMAN_ENTERED",
            report.getReportId()
        ));

        // Days to review (from generation to approval)
        if (report.getGeneratedAt() != null && report.getReviewedAt() != null) {
            long hoursToReview = java.time.Duration.between(
                report.getGeneratedAt(), report.getReviewedAt()).toHours();
            metrics.add(EsgMetricEntity.of(
                "Governance",
                "Time from report generation to HSE approval (hours)",
                String.valueOf(hoursToReview),
                "hours",
                period,
                source,
                "CALCULATED",
                report.getReportId()
            ));
        }

        return metrics;
    }

    // ── JSON Extraction Helpers ───────────────────────────────────────────────

    private boolean extractConfirmedRelease(String reportJson) {
        try {
            JsonNode root = objectMapper.readTree(reportJson);
            JsonNode exec = root.path("executiveSummary");
            if (!exec.isMissingNode()) {
                return exec.path("environmentalImpactOccurred").asBoolean(false);
            }
        } catch (Exception ex) {
            log.debug("EsgMetricExtractor: could not parse environmentalImpactOccurred");
        }
        return false;
    }

    private boolean isSpillPrevented(String reportJson) {
        try {
            JsonNode root = objectMapper.readTree(reportJson);
            // If environmental impact did NOT occur and sentinel responded — spill was prevented
            JsonNode exec = root.path("executiveSummary");
            boolean impactOccurred = exec.path("environmentalImpactOccurred").asBoolean(true);
            String response = exec.path("sentinelResponse").asText("");
            return !impactOccurred && !response.isBlank();
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean isCritical(String severity) {
        return "CRITICAL".equalsIgnoreCase(severity) || "Critical".equals(severity);
    }

    private int extractCapaCount(String reportJson) {
        try {
            JsonNode root = objectMapper.readTree(reportJson);
            JsonNode capas = root.path("capaRecommendations");
            if (capas.isArray()) return capas.size();
        } catch (Exception ex) {
            log.debug("EsgMetricExtractor: could not parse capaRecommendations");
        }
        return 0;
    }
}
