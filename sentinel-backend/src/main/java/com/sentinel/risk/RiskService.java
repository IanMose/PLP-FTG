package com.sentinel.risk;

import com.sentinel.common.dto.SiteDetailDto;
import com.sentinel.common.dto.SiteRiskSummaryDto;
import com.sentinel.common.dto.IncidentDto;
import com.sentinel.common.dto.AuditDto;
import com.sentinel.common.dto.TelemetryReadingDto;
import com.sentinel.site.*;
import com.sentinel.telemetry.TelemetryService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Risk scoring service.
 *
 * Transparent, rule-weighted score (not a black-box model):
 * - Incident frequency per site over a rolling window
 * - Severity mix (Critical/High incidents weighted more)
 * - Days since last audit
 * - Corrected/rejected rate for the site's records
 * - Pressure spike count from telemetry (leading indicator)
 *
 * Each input is judge-explainable and traceable back to Stage 1 data.
 */
@Service
public class RiskService {

    private static final double GATE_THRESHOLD = 0.90;

    // Canonical site coordinates for the heatmap.
    // Keys are lowercase to match dim_site PKs (site-001 not SITE-001).
    // Coordinates are public town-centre references for the KPC operational facilities.
    private static final Map<String, double[]> SITE_COORDS = Map.of(
        "site-001", new double[]{-1.292,  36.822},  // Nairobi Terminal (PS10 / Embakasi)
        "site-002", new double[]{-4.049,  39.674},  // Mombasa Terminal (Kipevu / PS14 / KOSF)
        "site-003", new double[]{-2.283,  37.833},  // Makueni Pipeline Section (Thange / Kibwezi area)
        "site-004", new double[]{-0.303,  36.080},  // Nakuru Depot (PS25)
        "site-005", new double[]{ 0.517,  35.268},  // Eldoret Terminal (PS27)
        "site-006", new double[]{ 0.043,  35.451},  // Sinendet Pump Station (PS26)
        "site-007", new double[]{-0.102,  34.762}   // Kisumu Terminal (PS28)
    );

    private final SiteRepository siteRepository;
    private final IncidentRepository incidentRepository;
    private final AuditRepository auditRepository;
    private final TelemetryService telemetryService;

    public RiskService(SiteRepository siteRepository,
                       IncidentRepository incidentRepository,
                       AuditRepository auditRepository,
                       TelemetryService telemetryService) {
        this.siteRepository = siteRepository;
        this.incidentRepository = incidentRepository;
        this.auditRepository = auditRepository;
        this.telemetryService = telemetryService;
    }

    public List<SiteRiskSummaryDto> computeRiskSummary() {
        List<SiteEntity> sites = siteRepository.findAll();

        // Pre-compute incident counts per site
        Map<String, Long> incidentCounts = new HashMap<>();
        for (Object[] row : incidentRepository.countBySite()) {
            incidentCounts.put((String) row[0], (Long) row[1]);
        }

        // Pre-compute severity counts (Critical + High) per site
        Map<String, Long> criticalHighBySite = new HashMap<>();
        for (Object[] row : incidentRepository.countCriticalHighBySite()) {
            criticalHighBySite.put((String) row[0], (Long) row[1]);
        }

        // Pre-compute decision rates for rejection %
        Map<String, Map<String, Long>> decisionsBySite = new HashMap<>();
        for (Object[] row : incidentRepository.countDecisionsBySite()) {
            String siteId = (String) row[0];
            String decision = (String) row[1];
            long count = (Long) row[2];
            decisionsBySite.computeIfAbsent(siteId, k -> new HashMap<>()).put(decision, count);
        }

        // Pre-compute latest audit dates
        Map<String, LocalDateTime> latestAudits = new HashMap<>();
        for (Object[] row : auditRepository.findLatestAuditDateBySite()) {
            latestAudits.put((String) row[0], (LocalDateTime) row[1]);
        }

        LocalDate today = LocalDate.now();

        return sites.stream().map(site -> {
            String siteId = site.getSiteId();
            long incidents = incidentCounts.getOrDefault(siteId, 0L);
            long critHigh = criticalHighBySite.getOrDefault(siteId, 0L);
            Map<String, Long> decisions = decisionsBySite.getOrDefault(siteId, Map.of());
            LocalDateTime lastAudit = latestAudits.get(siteId);

            // Use real calendar distance — 0d means audited today, still valid input
            int daysSinceAudit = lastAudit != null
                    ? (int) ChronoUnit.DAYS.between(lastAudit.toLocalDate(), today)
                    : 365; // never audited → max penalty

            long total = decisions.values().stream().mapToLong(Long::longValue).sum();
            long corrected = decisions.getOrDefault("corrected", 0L);
            long rejected = decisions.getOrDefault("rejected", 0L);
            double correctedRate = total > 0 ? (double) corrected / total : 0.0;
            double rejectedRate = total > 0 ? (double) rejected / total : 0.0;

            int pressureSpikes = telemetryService.getPressureSpikeCountForSite(siteId);

            int riskScore = computeRiskScore(incidents, critHigh, daysSinceAudit, rejectedRate, pressureSpikes);
            String severityBand = scoreToSeverityBand(riskScore);

            double[] coords = SITE_COORDS.getOrDefault(siteId, new double[]{0.0, 0.0});

            return SiteRiskSummaryDto.builder()
                    .siteId(siteId)
                    .siteName(site.getSiteName())
                    .latitude(coords[0])
                    .longitude(coords[1])
                    .riskScore(riskScore)
                    .severityBand(severityBand)
                    .incidentCount((int) incidents)
                    .pressureSpikeCount(pressureSpikes)
                    .lastAuditDate(lastAudit != null ? lastAudit.toLocalDate().toString() : null)
                    .daysSinceLastAudit(daysSinceAudit)
                    .correctedRate(Math.round(correctedRate * 100.0) / 100.0)
                    .rejectedRate(Math.round(rejectedRate * 100.0) / 100.0)
                    .build();
        }).collect(Collectors.toList());
    }

    public SiteDetailDto getSiteDetail(String siteId) {
        SiteEntity site = siteRepository.findById(siteId)
                .orElseThrow(() -> new NoSuchElementException("Site not found: " + siteId));

        List<IncidentEntity> incidents = incidentRepository.findBySiteIdOrderByIncidentDateDesc(siteId);
        List<AuditEntity> audits = auditRepository.findBySiteIdOrderByInspectionDateDesc(siteId);
        List<TelemetryReadingDto> telemetryReadings = telemetryService.getSiteReadings(siteId);

        // Compute risk score for this site
        Map<String, Long> decisions = incidents.stream()
                .collect(Collectors.groupingBy(IncidentEntity::getDecision, Collectors.counting()));
        long critHigh = incidents.stream()
                .filter(i -> "Critical".equalsIgnoreCase(i.getSeverity()) || "High".equalsIgnoreCase(i.getSeverity()))
                .count();
        long total = decisions.values().stream().mapToLong(Long::longValue).sum();
        long rejected = decisions.getOrDefault("rejected", 0L);
        double rejectedRate = total > 0 ? (double) rejected / total : 0.0;

        LocalDateTime lastAudit = audits.isEmpty() ? null : audits.get(0).getInspectionDate();
        int daysSinceAudit = lastAudit != null
                ? (int) ChronoUnit.DAYS.between(lastAudit.toLocalDate(), LocalDate.now())
                : 365;

        int pressureSpikes = telemetryService.getPressureSpikeCountForSite(siteId);
        int riskScore = computeRiskScore(incidents.size(), critHigh, daysSinceAudit, rejectedRate, pressureSpikes);

        // Get canonical coordinates
        double[] coords = SITE_COORDS.getOrDefault(siteId, new double[]{0.0, 0.0});

        List<IncidentDto> incidentDtos = incidents.stream().map(i -> IncidentDto.builder()
                .incidentId(i.getIncidentId())
                .siteId(i.getSiteId())
                .latitude(i.getLatitude())
                .longitude(i.getLongitude())
                .incidentDate(formatDate(i.getIncidentDate()))
                .severity(i.getSeverity())
                .description(i.getDescription())
                .complianceScore(i.getComplianceScore() != null ? i.getComplianceScore() : 0)
                .decision(i.getDecision())
                .decisionReason(i.getDecisionReason())
                .closedDate(i.getClosedDate() != null ? formatDate(i.getClosedDate()) : null)
                .build()
        ).collect(Collectors.toList());

        List<AuditDto> auditDtos = audits.stream().map(a -> AuditDto.builder()
                .auditId(a.getAuditId())
                .siteId(a.getSiteId())
                .inspectionDate(formatDate(a.getInspectionDate()))
                .auditor(a.getAuditor())
                .findings(a.getFindings())
                .complianceScore(a.getComplianceScore() != null ? a.getComplianceScore() : 0)
                .followUpRequired(Boolean.TRUE.equals(a.getFollowUpRequired()))
                .build()
        ).collect(Collectors.toList());

        return SiteDetailDto.builder()
                .siteId(site.getSiteId())
                .siteName(site.getSiteName())
                .location(site.getLocation())
                .latitude(coords[0])
                .longitude(coords[1])
                .riskScore(riskScore)
                .severityBand(scoreToSeverityBand(riskScore))
                .pressureSpikeCount(pressureSpikes)
                .incidents(incidentDtos)
                .audits(auditDtos)
                .telemetryReadings(telemetryReadings)
                .build();
    }

    /**
     * Rule-weighted risk score (0-100).
     *
     * Components and weights:
     *   - Incident frequency  (0.30): normalized against a ceiling of 200 incidents → 100pts
     *   - Severity mix        (0.30): ratio of Critical+High incidents to total, × 100
     *   - Audit recency       (0.20): days since last audit, normalized against 180-day ceiling
     *   - Rejection rate      (0.10): % of incidents rejected, amplified 5×
     *   - Pressure spikes     (0.10): spike count normalized against a ceiling of 10 → 100pts
     *
     * Transparent: every component is traceable to a raw data field.
     */
    private int computeRiskScore(long incidentCount, long criticalHighCount,
                                  int daysSinceAudit, double rejectedRate, int pressureSpikes) {
        // Incident frequency: 200+ incidents = max score for this component
        double incidentScore = Math.min(incidentCount / 2.0, 100.0);

        // Severity mix: fraction of incidents that are Critical or High severity
        double severityScore = incidentCount > 0
                ? Math.min((criticalHighCount * 100.0) / incidentCount, 100.0)
                : 0.0;

        // Audit recency: 180-day absence = max score; fresh audit (0d) = 0 score
        double auditScore = Math.min(daysSinceAudit / 1.8, 100.0);

        // Rejection rate: amplified — even 20% rejection is a strong signal
        double rejectionScore = Math.min(rejectedRate * 500.0, 100.0);

        // Pressure spikes: 10+ spikes = max score
        double telemetryScore = Math.min(pressureSpikes * 10.0, 100.0);

        double composite = (incidentScore  * 0.30)
                         + (severityScore  * 0.30)
                         + (auditScore     * 0.20)
                         + (rejectionScore * 0.10)
                         + (telemetryScore * 0.10);

        return (int) Math.min(Math.max(Math.round(composite), 0), 100);
    }

    private String scoreToSeverityBand(int score) {
        if (score >= 75) return "Critical";
        if (score >= 55) return "High";
        if (score >= 30) return "Medium";
        return "Low";
    }

    private String formatDate(LocalDateTime dt) {
        return dt.toLocalDate().toString();
    }
}
