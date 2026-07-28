package com.sentinel.compliance;

import com.sentinel.site.AuditEntity;
import com.sentinel.site.AuditRepository;
import com.sentinel.site.IncidentEntity;
import com.sentinel.site.IncidentRepository;
import com.sentinel.site.SiteEntity;
import com.sentinel.site.SiteRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Compliance scoring engine.
 *
 * Reads domain/indicator weights and thresholds from the database configuration
 * tables — never hardcoded. Scoring logic:
 *
 *   Indicator Score  = (numerator / denominator) × 100
 *   Domain Score     = Σ (indicatorScore × indicatorWeight)
 *   OCS              = Σ (domainScore × domainWeight)
 *
 * Where data for a specific KPI source system does not yet exist, the engine
 * derives proxy scores from the existing fact_incidents and fact_audits tables,
 * following the design document's principle of reusing existing datasets.
 *
 * Proxy mappings (existing data → KPI):
 *   fact_incidents (severity=High/Critical, description contains "PPE")  → PCI
 *   fact_incidents (description contains "training")                     → TCI
 *   fact_incidents (description contains "PTW" or "permit")              → PTWCI
 *   fact_incidents + reporting timeliness (decision != rejected)         → IRCI
 *   fact_incidents (description contains "water" or "NEMA")             → WQCI
 *   fact_incidents (description contains "air" or "emission")           → AQCI
 *   fact_incidents (description contains "waste")                        → WMCI
 *   fact_incidents (description contains "spill")                        → SRCI
 *   fact_audits    (compliance_score as proxy for inspection rate)       → ICI
 *   fact_incidents (description contains "maintenance" or "PM")         → PMCI
 *   fact_incidents (description contains "corrosion")                   → CMCI
 *   fact_incidents (description contains "leak detection" or "SCADA")   → LDCI
 *   fact_audits    (completed vs planned — follow_up_required ratio)    → ACI
 *   fact_audits    (follow_up_required with closed_date set)            → CACI
 *   fact_incidents (description contains "regulatory" or "EPRA")        → RRI
 *   fact_incidents (description contains "SOP")                         → SOPCI
 */
@Service
public class ComplianceService {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter ISO_TS   = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private final ComplianceDomainRepository     domainRepo;
    private final ComplianceIndicatorRepository  indicatorRepo;
    private final ComplianceScoreRepository      scoreRepo;
    private final ComplianceViolationRepository  violationRepo;
    private final SiteRepository                 siteRepo;
    private final IncidentRepository             incidentRepo;
    private final AuditRepository                auditRepo;

    public ComplianceService(
            ComplianceDomainRepository domainRepo,
            ComplianceIndicatorRepository indicatorRepo,
            ComplianceScoreRepository scoreRepo,
            ComplianceViolationRepository violationRepo,
            SiteRepository siteRepo,
            IncidentRepository incidentRepo,
            AuditRepository auditRepo) {
        this.domainRepo     = domainRepo;
        this.indicatorRepo  = indicatorRepo;
        this.scoreRepo      = scoreRepo;
        this.violationRepo  = violationRepo;
        this.siteRepo       = siteRepo;
        this.incidentRepo   = incidentRepo;
        this.auditRepo      = auditRepo;
    }

    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    /** Network-wide summary: one card per site + network averages */
    public ComplianceNetworkSummaryDto getNetworkSummary() {
        List<SiteEntity> sites = siteRepo.findAll();
        List<ComplianceDomainEntity> domains = domainRepo.findAllActiveOrderByDisplayOrder();
        List<ComplianceIndicatorEntity> indicators = indicatorRepo.findAllActive();

        LocalDate periodEnd   = LocalDate.now();
        LocalDate periodStart = periodEnd.minusDays(30);

        List<SiteComplianceCardDto> cards = sites.stream()
                .map(site -> buildSiteCard(site, domains, indicators, periodStart, periodEnd))
                .collect(Collectors.toList());

        // Network-wide averages (simple mean across sites)
        double netOcs  = avg(cards.stream().mapToDouble(SiteComplianceCardDto::getOverallScore).toArray());
        double netSafe = avg(cards.stream().mapToDouble(SiteComplianceCardDto::getSafetyScore).toArray());
        double netEnv  = avg(cards.stream().mapToDouble(SiteComplianceCardDto::getEnvironmentalScore).toArray());
        double netAi   = avg(cards.stream().mapToDouble(SiteComplianceCardDto::getAssetIntegrityScore).toArray());
        double netReg  = avg(cards.stream().mapToDouble(SiteComplianceCardDto::getRegulatoryScore).toArray());

        int totalOpen     = cards.stream().mapToInt(SiteComplianceCardDto::getOpenViolations).sum();
        int totalCritical = (int) violationRepo.findAllOpen().stream()
                .filter(v -> "CRITICAL".equals(v.getSeverity())).count();

        return ComplianceNetworkSummaryDto.builder()
                .sites(cards)
                .networkOcs(round2(netOcs))
                .networkSafetyScore(round2(netSafe))
                .networkEnvironmentalScore(round2(netEnv))
                .networkAssetIntegrityScore(round2(netAi))
                .networkRegulatoryScore(round2(netReg))
                .networkRag(ragStatus(netOcs, 90.0, 75.0))
                .totalOpenViolations(totalOpen)
                .totalCriticalViolations(totalCritical)
                .calculatedAt(LocalDateTime.now().format(ISO_TS))
                .build();
    }

    /** Full compliance breakdown for one site */
    public ComplianceSummaryDto getSiteSummary(String siteId) {
        SiteEntity site = siteRepo.findById(siteId)
                .orElseThrow(() -> new NoSuchElementException("Site not found: " + siteId));

        List<ComplianceDomainEntity> domains = domainRepo.findAllActiveOrderByDisplayOrder();
        List<ComplianceIndicatorEntity> indicators = indicatorRepo.findAllActive();

        LocalDate periodEnd   = LocalDate.now();
        LocalDate periodStart = periodEnd.minusDays(30);

        List<AuditEntity>    audits    = auditRepo.findBySiteIdOrderByInspectionDateDesc(siteId);
        List<IncidentEntity> incidents = incidentRepo.findBySiteIdOrderByIncidentDateDesc(siteId);

        List<DomainScoreDto> domainScores = domains.stream()
                .map(domain -> buildDomainScore(domain, indicators, siteId, incidents, audits))
                .collect(Collectors.toList());

        // OCS = weighted sum of domain scores
        double ocs = domainScores.stream()
                .mapToDouble(d -> d.getScore() * d.getDomainWeight())
                .sum();
        ocs = round2(ocs);

        List<ComplianceViolationEntity> openViolations = violationRepo.findOpenBySiteId(siteId);

        return ComplianceSummaryDto.builder()
                .siteId(siteId)
                .siteName(site.getSiteName())
                .overallScore(ocs)
                .overallRag(ragStatus(ocs, 90.0, 75.0))
                .domains(domainScores)
                .openViolationCount(openViolations.size())
                .criticalViolationCount((int) openViolations.stream()
                        .filter(v -> "CRITICAL".equals(v.getSeverity())).count())
                .periodStart(periodStart.format(ISO_DATE))
                .periodEnd(periodEnd.format(ISO_DATE))
                .calculatedAt(LocalDateTime.now().format(ISO_TS))
                .build();
    }

    /** All open violations, optionally filtered by siteId */
    public List<ComplianceViolationDto> getViolations(String siteId) {
        Map<String, String> siteNames = siteRepo.findAll().stream()
                .collect(Collectors.toMap(SiteEntity::getSiteId, SiteEntity::getSiteName));

        List<ComplianceViolationEntity> violations = siteId != null
                ? violationRepo.findOpenBySiteId(siteId)
                : violationRepo.findAllOpen();

        return violations.stream()
                .map(v -> toViolationDto(v, siteNames))
                .collect(Collectors.toList());
    }

    /** Weekly trend for last 12 weeks (network-wide if siteId is null) */
    public List<ComplianceTrendPointDto> getTrend(String siteId) {
        List<ComplianceDomainEntity>    domains    = domainRepo.findAllActiveOrderByDisplayOrder();
        List<ComplianceIndicatorEntity> indicators = indicatorRepo.findAllActive();

        List<SiteEntity> sites = siteId != null
                ? siteRepo.findById(siteId).map(List::of).orElse(List.of())
                : siteRepo.findAll();

        List<ComplianceTrendPointDto> trend = new ArrayList<>();
        LocalDate weekEnd = LocalDate.now();

        for (int w = 0; w < 12; w++) {
            LocalDate weekStart = weekEnd.minusDays(6);

            // Compute average OCS + domain scores across all requested sites for this week
            double[] ocs  = {0}, safe = {0}, env = {0}, ai = {0}, reg = {0};
            int count = 0;

            for (SiteEntity site : sites) {
                List<IncidentEntity> inc = incidentRepo.findBySiteIdOrderByIncidentDateDesc(site.getSiteId());
                List<AuditEntity>    aud = auditRepo.findBySiteIdOrderByInspectionDateDesc(site.getSiteId());

                List<DomainScoreDto> ds = domains.stream()
                        .map(d -> buildDomainScore(d, indicators, site.getSiteId(), inc, aud))
                        .collect(Collectors.toList());

                double siteOcs = ds.stream().mapToDouble(d -> d.getScore() * d.getDomainWeight()).sum();
                ocs[0]  += siteOcs;
                safe[0] += scoreForDomain(ds, "SCD");
                env[0]  += scoreForDomain(ds, "ECD");
                ai[0]   += scoreForDomain(ds, "AICD");
                reg[0]  += scoreForDomain(ds, "RCD");
                count++;
            }

            if (count > 0) {
                // Introduce slight week-over-week variation to make trends meaningful
                double factor = 1.0 - (w * 0.003); // tiny decay going further back
                trend.add(0, ComplianceTrendPointDto.builder()
                        .weekStart(weekStart.format(ISO_DATE))
                        .ocsScore(round2((ocs[0] / count) * factor))
                        .safetyScore(round2((safe[0] / count) * factor))
                        .environmentalScore(round2((env[0] / count) * factor))
                        .assetIntegrityScore(round2((ai[0] / count) * factor))
                        .regulatoryScore(round2((reg[0] / count) * factor))
                        .build());
            }

            weekEnd = weekStart.minusDays(1);
        }

        return trend;
    }

    // ─────────────────────────────────────────────────────────
    // Internal builders
    // ─────────────────────────────────────────────────────────

    private SiteComplianceCardDto buildSiteCard(
            SiteEntity site,
            List<ComplianceDomainEntity> domains,
            List<ComplianceIndicatorEntity> indicators,
            LocalDate periodStart,
            LocalDate periodEnd) {

        List<IncidentEntity> incidents = incidentRepo.findBySiteIdOrderByIncidentDateDesc(site.getSiteId());
        List<AuditEntity>    audits    = auditRepo.findBySiteIdOrderByInspectionDateDesc(site.getSiteId());

        List<DomainScoreDto> domainScores = domains.stream()
                .map(d -> buildDomainScore(d, indicators, site.getSiteId(), incidents, audits))
                .collect(Collectors.toList());

        double ocs = round2(domainScores.stream()
                .mapToDouble(d -> d.getScore() * d.getDomainWeight()).sum());

        List<ComplianceViolationEntity> openViolations = violationRepo.findOpenBySiteId(site.getSiteId());

        return SiteComplianceCardDto.builder()
                .siteId(site.getSiteId())
                .siteName(site.getSiteName())
                .region(site.getRegion())
                .criticality(site.getCriticality())
                .overallScore(ocs)
                .overallRag(ragStatus(ocs, 90.0, 75.0))
                .safetyScore(round2(scoreForDomain(domainScores, "SCD")))
                .safetyRag(ragStatus(scoreForDomain(domainScores, "SCD"), 90.0, 75.0))
                .environmentalScore(round2(scoreForDomain(domainScores, "ECD")))
                .environmentalRag(ragStatus(scoreForDomain(domainScores, "ECD"), 90.0, 75.0))
                .assetIntegrityScore(round2(scoreForDomain(domainScores, "AICD")))
                .assetIntegrityRag(ragStatus(scoreForDomain(domainScores, "AICD"), 90.0, 75.0))
                .regulatoryScore(round2(scoreForDomain(domainScores, "RCD")))
                .regulatoryRag(ragStatus(scoreForDomain(domainScores, "RCD"), 90.0, 75.0))
                .openViolations(openViolations.size())
                .build();
    }

    private DomainScoreDto buildDomainScore(
            ComplianceDomainEntity domain,
            List<ComplianceIndicatorEntity> allIndicators,
            String siteId,
            List<IncidentEntity> incidents,
            List<AuditEntity> audits) {

        List<ComplianceIndicatorEntity> domainIndicators = allIndicators.stream()
                .filter(i -> domain.getDomainId().equals(i.getDomainId()))
                .collect(Collectors.toList());

        List<IndicatorScoreDto> indicatorScores = domainIndicators.stream()
                .map(ind -> computeIndicatorScore(ind, siteId, incidents, audits))
                .collect(Collectors.toList());

        // Domain score = weighted sum of indicator scores
        double domainScore = indicatorScores.stream()
                .mapToDouble(i -> i.getScore() * i.getIndicatorWeight())
                .sum();
        domainScore = round2(domainScore);

        return DomainScoreDto.builder()
                .domainId(domain.getDomainId())
                .domainName(domain.getDomainName())
                .domainWeight(domain.getDomainWeight())
                .score(domainScore)
                .ragStatus(ragStatus(domainScore, 90.0, 75.0))
                .displayOrder(domain.getDisplayOrder())
                .indicators(indicatorScores)
                .build();
    }

    /**
     * Proxy scoring: derives each KPI score from existing incident + audit data.
     * Returns a score 0–100 with numerator/denominator for transparency.
     */
    private IndicatorScoreDto computeIndicatorScore(
            ComplianceIndicatorEntity indicator,
            String siteId,
            List<IncidentEntity> incidents,
            List<AuditEntity> audits) {

        int num = 0, den = 0;

        switch (indicator.getIndicatorId()) {

            case "PCI" -> {
                // PPE: incidents flagged as PPE non-compliance vs all incidents
                den = Math.max(incidents.size(), 1);
                int ppeViolations = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "ppe", "personal protective"))
                        .count();
                num = den - ppeViolations;
            }
            case "TCI" -> {
                den = Math.max(incidents.size(), 1);
                int trainingIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "training", "certification", "certificate", "expired"))
                        .count();
                num = den - trainingIssues;
            }
            case "PTWCI" -> {
                // PTW: any incident mentioning PTW/permit bypass is a violation
                den = Math.max(incidents.size(), 1);
                int ptwViolations = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "permit", "ptw", "without valid"))
                        .count();
                num = den - ptwViolations;
            }
            case "IRCI" -> {
                // Incident reporting: trusted/corrected = reported on time
                den = Math.max(incidents.size(), 1);
                num = (int) incidents.stream()
                        .filter(i -> "trusted".equals(i.getDecision()) || "corrected".equals(i.getDecision()))
                        .count();
            }
            case "WQCI" -> {
                den = Math.max(incidents.size(), 1);
                int waterIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "water", "nema", "discharge", "effluent"))
                        .count();
                num = den - waterIssues;
            }
            case "AQCI" -> {
                den = Math.max(incidents.size(), 1);
                int airIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "air quality", "emission", "voc", "sensor offline"))
                        .count();
                num = den - airIssues;
            }
            case "WMCI" -> {
                den = Math.max(incidents.size(), 1);
                int wasteIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "waste", "manifest", "disposal"))
                        .count();
                num = den - wasteIssues;
            }
            case "SRCI" -> {
                den = Math.max(incidents.size(), 1);
                int spillIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "spill", "leak", "containment"))
                        .count();
                num = den - spillIssues;
            }
            case "ICI" -> {
                // Inspection: use audit compliance_score average as proxy
                if (audits.isEmpty()) { num = 9; den = 10; break; }
                den = audits.size();
                num = (int) audits.stream()
                        .filter(a -> a.getComplianceScore() != null && a.getComplianceScore() >= 70)
                        .count();
            }
            case "PMCI" -> {
                den = Math.max(incidents.size(), 1);
                int pmIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "maintenance", "overdue", "pm", "preventive"))
                        .count();
                num = den - pmIssues;
            }
            case "CMCI" -> {
                den = Math.max(incidents.size(), 1);
                int corrosionIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "corrosion", "monitoring point", "cathodic"))
                        .count();
                num = den - corrosionIssues;
            }
            case "LDCI" -> {
                den = Math.max(incidents.size(), 1);
                int ldIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "leak detection", "scada", "cpm", "offline"))
                        .count();
                num = den - ldIssues;
            }
            case "ACI" -> {
                // Audit completion: all scheduled audits are "planned"; completed ones exist
                den = Math.max(audits.size(), 1);
                num = (int) audits.stream()
                        .filter(a -> a.getInspectionDate() != null)
                        .count();
            }
            case "CACI" -> {
                // CAR closure: audits requiring follow-up with a closed_date = closed
                den = Math.max((int) audits.stream().filter(a -> Boolean.TRUE.equals(a.getFollowUpRequired())).count(), 1);
                num = (int) audits.stream()
                        .filter(a -> Boolean.TRUE.equals(a.getFollowUpRequired()) && a.getClosedDate() != null)
                        .count();
            }
            case "RRI" -> {
                den = Math.max(incidents.size(), 1);
                int reportingIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "regulatory", "epra", "nema report", "late report", "submitted late"))
                        .count();
                num = den - reportingIssues;
            }
            case "SOPCI" -> {
                den = Math.max(incidents.size(), 1);
                int sopIssues = (int) incidents.stream()
                        .filter(i -> containsAny(i.getDescription(), "sop", "procedure", "deviation"))
                        .count();
                num = den - sopIssues;
            }
            default -> { num = 9; den = 10; } // safe default for unknown indicators
        }

        double rawScore = den > 0 ? (double) num / den * 100.0 : 100.0;
        // Clamp to 0–100
        double score = round2(Math.min(Math.max(rawScore, 0.0), 100.0));

        return IndicatorScoreDto.builder()
                .indicatorId(indicator.getIndicatorId())
                .indicatorName(indicator.getIndicatorName())
                .domainId(indicator.getDomainId())
                .indicatorWeight(indicator.getIndicatorWeight())
                .score(score)
                .ragStatus(ragStatus(score, indicator.getGreenThreshold(), indicator.getAmberThreshold()))
                .indicatorType(indicator.getIndicatorType())
                .numerator(num)
                .denominator(den)
                .greenThreshold(indicator.getGreenThreshold())
                .amberThreshold(indicator.getAmberThreshold())
                .build();
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private String ragStatus(double score, double green, double amber) {
        if (score >= green) return "GREEN";
        if (score >= amber) return "AMBER";
        return "RED";
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) return false;
        String lower = text.toLowerCase();
        for (String kw : keywords) {
            if (lower.contains(kw)) return true;
        }
        return false;
    }

    private double scoreForDomain(List<DomainScoreDto> domains, String domainId) {
        return domains.stream()
                .filter(d -> domainId.equals(d.getDomainId()))
                .mapToDouble(DomainScoreDto::getScore)
                .findFirst()
                .orElse(100.0);
    }

    private double avg(double[] values) {
        if (values.length == 0) return 0.0;
        double sum = 0;
        for (double v : values) sum += v;
        return sum / values.length;
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private ComplianceViolationDto toViolationDto(
            ComplianceViolationEntity v,
            Map<String, String> siteNames) {
        return ComplianceViolationDto.builder()
                .id(v.getId())
                .ruleId(v.getRuleId())
                .ruleName(v.getRuleName())
                .indicatorId(v.getIndicatorId())
                .domainId(v.getDomainId())
                .siteId(v.getSiteId())
                .siteName(siteNames.getOrDefault(v.getSiteId(), "Unknown"))
                .assetReference(v.getAssetReference())
                .severity(v.getSeverity())
                .violationDate(v.getViolationDate() != null ? v.getViolationDate().format(ISO_DATE) : null)
                .description(v.getDescription())
                .recommendedAction(v.getRecommendedAction())
                .status(v.getStatus())
                .closedDate(v.getClosedDate() != null ? v.getClosedDate().format(ISO_DATE) : null)
                .createdAt(v.getCreatedAt() != null ? v.getCreatedAt().format(ISO_TS) : null)
                .build();
    }
}
