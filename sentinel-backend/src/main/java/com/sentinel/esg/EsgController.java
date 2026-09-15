package com.sentinel.esg;

import com.sentinel.actuation.ActuationService;
import com.sentinel.alert.AlertRepository;
import com.sentinel.capa.CapaRepository;
import com.sentinel.event.EventService;
import com.sentinel.quality.QualityService;
import com.sentinel.site.IncidentRepository;
import com.sentinel.telemetry.TankTelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * EsgController — Automated ESG Report API.
 *
 * Pulls live Sentinel operational data and maps it to the three ESG pillars:
 *
 *   Environmental — spills prevented, litres saved, sites monitored
 *   Social        — community risk avoided, Sinai/Thange-class events prevented
 *   Governance    — audit compliance, CAPA closure rate, data quality, response time
 *
 * All data comes from existing services — no new data collection, just a new
 * lens on what Sentinel already knows.
 *
 * GET /api/esg/report?period=30d|90d|365d
 */
@RestController
@RequestMapping("/api/esg")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class EsgController {

    private final EventService eventService;
    private final ActuationService actuationService;
    private final IncidentRepository incidentRepository;
    private final AlertRepository alertRepository;
    private final CapaRepository capaRepository;
    private final QualityService qualityService;
    private final TankTelemetryRepository tankTelemetryRepository;

    // High-risk sites — Sinai/Thange class
    private static final long SITES_MONITORED = 7L;
    private static final long PIPELINE_KM_MONITORED = 450L; // Mombasa–Nairobi corridor
    // Thange judgment reference
    private static final double THANGE_AWARD_KES = 3_020_000_000.0;

    // ── Main Report Endpoint ──────────────────────────────────────────────────

    /**
     * GET /api/esg/report?period=30d
     *
     * Returns a structured ESG report with three pillars.
     * Period options: 30d, 90d, 365d (defaults to 30d)
     */
    @GetMapping("/report")
    public ResponseEntity<EsgReport> getReport(
            @RequestParam(defaultValue = "30d") String period) {

        LocalDateTime since = parsePeriod(period);
        LocalDate sinceDate = since.toLocalDate();
        log.info("Generating ESG report for period={} (since={})", period, since);

        // ── Environmental ─────────────────────────────────────────────────────
        long overfillsPrevented    = eventService.countOverfillEvents(since);
        long valveClosures         = actuationService.countSuccessfulClosures(since);
        long litresSaved           = actuationService.calculateLitresSaved(since);
        long kesSaved              = actuationService.calculateKesSaved(since);
        long totalIncidents        = incidentRepository.countAll();
        long criticalIncidents     = incidentRepository.countBySiteIdAndIncidentDateAfter("site-003", since)
                                   + incidentRepository.countBySiteIdAndIncidentDateAfter("site-006", since);

        // Overfill detection coverage — % of loading operations monitored
        long totalReadings         = tankTelemetryRepository.countByReadingTimestampAfter(since);
        long overfillRiskReadings  = tankTelemetryRepository.countOverfillEvents(
                                        new BigDecimal("95.0"), since);

        EnvironmentalMetrics environmental = new EnvironmentalMetrics(
            overfillsPrevented,
            valveClosures,
            litresSaved,
            kesSaved,
            SITES_MONITORED,
            PIPELINE_KM_MONITORED,
            totalReadings,
            overfillRiskReadings,
            criticalIncidents,
            "Estimated based on 500L average spill volume per overfill event prevented. " +
            "KES value at KES 150/litre."
        );

        // ── Social ────────────────────────────────────────────────────────────
        // Community liability avoided — modelled on Thange judgment scale
        // Each prevented spill avoids a fraction of the KES 3.02B Thange exposure
        double fractionPerEvent    = overfillsPrevented > 0
                                     ? Math.min(1.0, overfillsPrevented * 0.01) : 0.0;
        long communityExposureAvoided = Math.round(THANGE_AWARD_KES * fractionPerEvent);

        // High-risk site events — Sinai/Thange class
        long sinaClassEventsWatched = tankTelemetryRepository.countOverfillEventsBySite("site-003")
                                    + tankTelemetryRepository.countOverfillEventsBySite("site-006");

        // Total alerts generated (community-facing operational visibility)
        long totalAlerts           = alertRepository.count();

        SocialMetrics social = new SocialMetrics(
            overfillsPrevented,
            communityExposureAvoided,
            sinaClassEventsWatched,
            SITES_MONITORED,
            totalAlerts,
            "The 2011 Sinai fire (~100 lives) and 2015 Thange spill (Kimeu v. KPC, KES 3.02B) " +
            "both originated as undetected valve/tank failures. Each prevented overfill event " +
            "directly reduces community risk exposure of this class.",
            THANGE_AWARD_KES
        );

        // ── Governance ────────────────────────────────────────────────────────
        // CAPA metrics
        Long capasClosed           = capaRepository.countClosed();
        Long capasOverdue          = capaRepository.countOverdue(LocalDate.now());
        long capasCreated          = capaRepository.countCreatedSince(since);
        Double avgClosureDays      = capaRepository.avgClosureDays();
        Long closedBeforeDue       = capaRepository.countClosedBeforeDue();
        double capaOnTimeRate      = (capasClosed != null && capasClosed > 0 && closedBeforeDue != null)
                                     ? (double) closedBeforeDue / capasClosed * 100.0 : 0.0;

        // Data quality
        var qualitySummary         = qualityService.getSummary();
        double dataQualityRate     = qualitySummary.getPassRate() * 100.0;
        String dataGateStatus      = qualitySummary.getGateStatus();

        // Response time
        Double avgResponseMs       = actuationService.getAverageLatency(since);
        double avgResponseSec      = avgResponseMs != null ? avgResponseMs / 1000.0 : 0.0;

        // Audit compliance — alerts on high-risk sites that were acknowledged
        long openAlerts            = alertRepository.findByStatusOrderByCreatedAtDesc("active").size();
        long acknowledgedAlerts    = alertRepository.findByStatusOrderByCreatedAtDesc("acknowledged").size();
        double alertAckRate        = (openAlerts + acknowledgedAlerts) > 0
                                     ? (double) acknowledgedAlerts / (openAlerts + acknowledgedAlerts) * 100.0
                                     : 100.0;

        GovernanceMetrics governance = new GovernanceMetrics(
            capasCreated,
            capasClosed != null ? capasClosed : 0L,
            capasOverdue != null ? capasOverdue : 0L,
            avgClosureDays != null ? Math.round(avgClosureDays * 10.0) / 10.0 : 0.0,
            Math.round(capaOnTimeRate * 10.0) / 10.0,
            Math.round(dataQualityRate * 10.0) / 10.0,
            dataGateStatus,
            qualitySummary.getTotal(),
            Math.round(avgResponseSec * 100.0) / 100.0,
            Math.round(alertAckRate * 10.0) / 10.0,
            openAlerts
        );

        // ── Report Assembly ───────────────────────────────────────────────────
        EsgReport report = new EsgReport(
            period,
            since.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")),
            environmental,
            social,
            governance,
            "Sentinel ESG metrics are derived directly from live operational data. " +
            "Financial estimates use stated assumptions and are not audited figures. " +
            "Sinai and Thange references are factual public record."
        );

        log.info("ESG report generated: {} overfills prevented, {}L saved, {} CAPAs tracked",
            overfillsPrevented, litresSaved, capasCreated);

        return ResponseEntity.ok(report);
    }

    // ── Period Parser ─────────────────────────────────────────────────────────

    private LocalDateTime parsePeriod(String period) {
        return switch (period) {
            case "90d"  -> LocalDateTime.now().minusDays(90);
            case "365d" -> LocalDateTime.now().minusDays(365);
            default     -> LocalDateTime.now().minusDays(30);   // 30d default
        };
    }

    // ── Response DTOs ─────────────────────────────────────────────────────────

    public record EsgReport(
        String period,
        String periodStart,
        String generatedAt,
        EnvironmentalMetrics environmental,
        SocialMetrics social,
        GovernanceMetrics governance,
        String disclaimer
    ) {}

    public record EnvironmentalMetrics(
        long overfillEventsPrevented,
        long automatedValveClosures,
        long estimatedLitresSaved,
        long estimatedKesValueSaved,
        long sitesMonitored,
        long pipelineKmMonitored,
        long totalTelemetryReadings,
        long overfillRiskReadingsDetected,
        long criticalIncidentsAtHighRiskSites,
        String assumption
    ) {}

    public record SocialMetrics(
        long spillIncidentsPrevented,
        long estimatedCommunityLiabilityAvoided,
        long sinaiClassEventsMonitored,
        long communitiesProtected,
        long totalAlertsGenerated,
        String sinaiThangeContext,
        double thangeAwardReferenceKes
    ) {}

    public record GovernanceMetrics(
        long capaActionsCreated,
        long capaActionsClosed,
        long capaActionsOverdue,
        double avgCapaClosureDays,
        double capaOnTimeClosureRate,
        double dataQualityPassRate,
        String dataQualityGateStatus,
        int totalRecordsProcessed,
        double avgAutomatedResponseTimeSec,
        double alertAcknowledgementRate,
        long openAlerts
    ) {}
}
