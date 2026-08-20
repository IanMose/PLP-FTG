package com.sentinel.alert;

import com.sentinel.site.AuditEntity;
import com.sentinel.site.AuditRepository;
import com.sentinel.site.IncidentEntity;
import com.sentinel.site.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Alert rules engine — evaluates each live ETL batch against a set of
 * named rules and persists new alerts into the alerts table.
 *
 * Rules (matching the rule strings already established in V2 seed data):
 *
 *   RULE_HIGH_REJECT_RATE
 *     If ≥10% of new incidents for a site have decision=rejected, raise a
 *     High alert. Reflects a data quality degradation signal.
 *
 *   RULE_CRITICAL_CLUSTER
 *     If 2+ new Critical/High severity incidents arrive for the same site in
 *     one batch, raise a Critical alert. Simulates an incident spike pattern.
 *
 *   RULE_CRITICAL_HIGH_RISK
 *     Any single Critical-severity incident at a high-risk site (site-003 or
 *     site-006) raises a Critical alert immediately — these sites are already
 *     on the Kimeu v. KPC watch list.
 *
 *   RULE_AUDIT_OVERDUE
 *     High-risk sites must be audited every 14 days. Checked once per batch
 *     cycle using the latest audit date across all audits for that site.
 *
 * Deduplication: before saving, check if an active alert for the same
 * site + rule already exists. If yes, skip — no alert storm.
 *
 * Narrative generation: NarrativeService is called inside maybeCreateAlert()
 * with the specific context variables for each rule, so every persisted alert
 * carries a rich, human-readable narrative field from day one.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertRulesEngine {

    static final String RULE_HIGH_REJECT_RATE   = "Site rejection rate > 10%";
    static final String RULE_CRITICAL_CLUSTER   = "Critical incident cluster";
    static final String RULE_CRITICAL_HIGH_RISK = "Critical incident at high-risk site";
    static final String RULE_AUDIT_OVERDUE      = "Audit frequency threshold (14d for high-risk)";

    private static final Set<String> HIGH_RISK_SITES = Set.of("site-003", "site-006");
    private static final int AUDIT_OVERDUE_DAYS = 14;

    private final AlertRepository   alertRepository;
    private final AuditRepository   auditRepository;
    private final IncidentRepository incidentRepository;
    private final NarrativeService  narrativeService;

    /**
     * Evaluate all rules against the newly ingested incidents and audits.
     * Called by EtlReloadService after each batch loads successfully.
     *
     * @param newIncidents          incidents persisted in this reload cycle
     * @param allNewIncidentAttempts all incident rows attempted (includes rejected)
     */
    @Transactional
    public void evaluate(List<IncidentEntity> newIncidents,
                         List<IncidentEntity> allNewIncidentAttempts) {
        if (newIncidents == null) newIncidents = List.of();

        evaluateRejectionRate(newIncidents, allNewIncidentAttempts);
        evaluateCriticalCluster(newIncidents);
        evaluateCriticalHighRisk(newIncidents);
        evaluateAuditOverdue();
    }

    // ── Rule 1: High rejection rate ───────────────────────────────────────────

    private void evaluateRejectionRate(List<IncidentEntity> saved,
                                       List<IncidentEntity> attempted) {
        Map<String, Long> totalBySite = attempted.stream()
                .filter(i -> i.getSiteId() != null)
                .collect(Collectors.groupingBy(IncidentEntity::getSiteId, Collectors.counting()));

        Map<String, Long> rejectedBySite = attempted.stream()
                .filter(i -> i.getSiteId() != null && "rejected".equals(i.getDecision()))
                .collect(Collectors.groupingBy(IncidentEntity::getSiteId, Collectors.counting()));

        for (Map.Entry<String, Long> entry : rejectedBySite.entrySet()) {
            String siteId = entry.getKey();
            long rejected = entry.getValue();
            long total = totalBySite.getOrDefault(siteId, 1L);
            double rate = (double) rejected / total;

            if (rate >= 0.10) {
                String recordIds = attempted.stream()
                        .filter(i -> siteId.equals(i.getSiteId()) && "rejected".equals(i.getDecision()))
                        .map(IncidentEntity::getIncidentId)
                        .collect(Collectors.joining(","));

                String narrative = narrativeService.forHighRejectRate(siteId, rejected, total, recordIds);

                maybeCreateAlert(
                        siteId,
                        RULE_HIGH_REJECT_RATE,
                        "High",
                        String.format("High rejection rate — %s", siteId),
                        String.format("%.0f%% of records rejected in latest batch at %s — exceeds 10%% site threshold.",
                                rate * 100, siteId),
                        recordIds,
                        narrative
                );
            }
        }
    }

    // ── Rule 2: Critical/High incident cluster ────────────────────────────────

    private void evaluateCriticalCluster(List<IncidentEntity> newIncidents) {
        Map<String, List<IncidentEntity>> critHighBySite = newIncidents.stream()
                .filter(i -> "Critical".equalsIgnoreCase(i.getSeverity())
                          || "High".equalsIgnoreCase(i.getSeverity()))
                .collect(Collectors.groupingBy(IncidentEntity::getSiteId));

        for (Map.Entry<String, List<IncidentEntity>> entry : critHighBySite.entrySet()) {
            if (entry.getValue().size() >= 2) {
                String siteId = entry.getKey();
                List<IncidentEntity> clusterIncidents = entry.getValue();
                String recordIds = clusterIncidents.stream()
                        .map(IncidentEntity::getIncidentId)
                        .collect(Collectors.joining(","));

                String narrative = narrativeService.forCriticalCluster(siteId, clusterIncidents);

                maybeCreateAlert(
                        siteId,
                        RULE_CRITICAL_CLUSTER,
                        "Critical",
                        String.format("Critical incident cluster — %s", siteId),
                        String.format("%d Critical/High incidents ingested in a single batch at %s.",
                                clusterIncidents.size(), siteId),
                        recordIds,
                        narrative
                );
            }
        }
    }

    // ── Rule 3: Single Critical incident at high-risk site ────────────────────

    private void evaluateCriticalHighRisk(List<IncidentEntity> newIncidents) {
        newIncidents.stream()
                .filter(i -> HIGH_RISK_SITES.contains(i.getSiteId()))
                .filter(i -> "Critical".equalsIgnoreCase(i.getSeverity()))
                .forEach(i -> {
                    String narrative = narrativeService.forCriticalHighRisk(i.getSiteId(), i);
                    maybeCreateAlert(
                            i.getSiteId(),
                            RULE_CRITICAL_HIGH_RISK,
                            "Critical",
                            String.format("Critical incident at high-risk site — %s", i.getSiteId()),
                            String.format("Critical severity incident %s ingested at monitored high-risk site %s.",
                                    i.getIncidentId(), i.getSiteId()),
                            i.getIncidentId(),
                            narrative
                    );
                });
    }

    // ── Rule 4: Audit overdue for high-risk sites ─────────────────────────────

    private void evaluateAuditOverdue() {
        Map<String, LocalDateTime> latestAudits = new HashMap<>();
        for (Object[] row : auditRepository.findLatestAuditDateBySite()) {
            latestAudits.put((String) row[0], (LocalDateTime) row[1]);
        }

        LocalDate today = LocalDate.now();

        for (String siteId : HIGH_RISK_SITES) {
            LocalDateTime lastAudit = latestAudits.get(siteId);
            int daysSince = lastAudit != null
                    ? (int) ChronoUnit.DAYS.between(lastAudit.toLocalDate(), today)
                    : 999; // never audited → always overdue

            if (daysSince >= AUDIT_OVERDUE_DAYS) {
                String narrative = narrativeService.forAuditOverdue(siteId, daysSince);
                maybeCreateAlert(
                        siteId,
                        RULE_AUDIT_OVERDUE,
                        "High",
                        String.format("Audit overdue — %s", siteId),
                        String.format("Last audit was %d days ago. Threshold is %d days for high-risk sites.",
                                daysSince, AUDIT_OVERDUE_DAYS),
                        "",
                        narrative
                );
            }
        }
    }

    /**
     * Staleness pass — runs every ETL cycle after the rules evaluation.
     * Compares the current incident count against the count stored when the
     * narrative was last written (narrativeIncidentCount on the entity).
     * Only rewrites when the change is significant — prevents churn on every cycle.
     *
     * Thresholds (at least one must be exceeded):
     *  - RULE_HIGH_REJECT_RATE:   incident count increased by ≥10
     *  - RULE_CRITICAL_CLUSTER:   incident count increased by ≥5
     *  - RULE_CRITICAL_HIGH_RISK: incident count increased by ≥5
     *  - RULE_AUDIT_OVERDUE:      days-since-audit increased by ≥7
     */
    @Transactional
    public void refreshStaleNarratives() {
        List<AlertEntity> activeAlerts = alertRepository.findByStatusOrderByCreatedAtDesc("active");
        if (activeAlerts.isEmpty()) return;

        for (AlertEntity alert : activeAlerts) {
            try {
                String rule   = alert.getRule();
                String siteId = alert.getSiteId();
                long   prevCount = alert.getNarrativeIncidentCount() != null
                        ? alert.getNarrativeIncidentCount() : 0L;
                String freshNarrative = null;
                long   newCount = prevCount;

                if (RULE_HIGH_REJECT_RATE.equals(rule)) {
                    long currentCount = safeIncidentCount(siteId, 30);
                    if (currentCount >= prevCount + 10) {
                        freshNarrative = narrativeService.forHighRejectRate(
                                siteId, currentCount, currentCount, alert.getRecordIds());
                        newCount = currentCount;
                    }

                } else if (RULE_CRITICAL_CLUSTER.equals(rule)) {
                    long currentCount = safeIncidentCount(siteId, 7);
                    if (currentCount >= prevCount + 5) {
                        freshNarrative = narrativeService.forCriticalCluster(siteId, List.of());
                        newCount = currentCount;
                    }

                } else if (RULE_CRITICAL_HIGH_RISK.equals(rule)) {
                    long currentCount = safeIncidentCount(siteId, 30);
                    if (currentCount >= prevCount + 5) {
                        freshNarrative = narrativeService.forCriticalHighRisk(siteId, null);
                        newCount = currentCount;
                    }

                } else if (RULE_AUDIT_OVERDUE.equals(rule)) {
                    int currentDays = safeAuditDays(siteId);
                    int prevDays    = extractPrevAuditDays(alert.getNarrative());
                    if (currentDays >= prevDays + 7) {
                        freshNarrative = narrativeService.forAuditOverdue(siteId, currentDays);
                    }
                }

                if (freshNarrative != null) {
                    alert.setNarrative(freshNarrative);
                    alert.setNarrativeUpdatedAt(java.time.LocalDateTime.now());
                    alert.setNarrativeIncidentCount(newCount);
                    alertRepository.save(alert);
                    log.info("AlertRulesEngine: narrative refreshed for alert [{}] site={} rule='{}' prevCount={} newCount={}",
                            alert.getId(), siteId, rule, prevCount, newCount);
                }

            } catch (Exception ex) {
                log.debug("AlertRulesEngine: staleness check failed for alert [{}]: {}", alert.getId(), ex.getMessage());
            }
        }
    }

    // ── Staleness helpers ─────────────────────────────────────────────────────

    private long safeIncidentCount(String siteId, int days) {
        try {
            java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(days);
            return incidentRepository.countBySiteIdAndIncidentDateAfter(siteId, since);
        } catch (Exception ex) {
            return 0L;
        }
    }

    private int safeAuditDays(String siteId) {
        try {
            return auditRepository.findLatestAuditDateBySite().stream()
                    .filter(row -> siteId.equals(row[0]))
                    .findFirst()
                    .map(row -> {
                        if (row[1] == null) return 999;
                        try {
                            java.time.LocalDate d = java.time.LocalDate.parse(row[1].toString().substring(0, 10));
                            return (int) java.time.temporal.ChronoUnit.DAYS.between(d, java.time.LocalDate.now());
                        } catch (Exception e) { return 999; }
                    }).orElse(999);
        } catch (Exception ex) {
            return 999;
        }
    }

    /** Extracts the incident count from phrases like "logged N incident(s)" in existing narrative text. */
    private long extractPrevIncidentCount(String narrative) {
        if (narrative == null) return 0L;
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("logged (\\d+) incident").matcher(narrative);
        if (m.find()) {
            try { return Long.parseLong(m.group(1)); } catch (NumberFormatException ignored) {}
        }
        return 0L;
    }

    /** Extracts the audit day count from phrases like "N days ago" in existing narrative text. */
    private int extractPrevAuditDays(String narrative) {
        if (narrative == null) return 0;
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+) days? ago").matcher(narrative);
        if (m.find()) {
            try { return Integer.parseInt(m.group(1)); } catch (NumberFormatException ignored) {}
        }
        return 0;
    }

    // ── Rule 5: Hazard report risk rating ─────────────────────────────────────

    /**
     * Called by HazardReportService when a risk assessment yields rating >= 10.
     * Returns the created alert ID (or null if deduplication skipped creation).
     */
    @Transactional
    public String createHazardAlert(com.sentinel.hazard.HazardReportEntity report, String severity) {
        String rule = "HAZARD_REPORT_RISK_RATING";
        String narrative = narrativeService.forHazardRiskRating(report, severity);
        return maybeCreateAlertReturningId(
                report.getSiteId(), rule, severity,
                String.format("Hazard risk assessment — %s", report.getSiteId()),
                String.format("Hazard report (category: %s) rated %d/25 — escalated to %s.",
                        report.getCategory(), report.getRiskRating(), severity),
                "", narrative);
    }

    // ── Shared: deduplication + persist ──────────────────────────────────────

    /**
     * Creates and saves an alert only if no active alert already exists
     * for this site + rule combination — prevents duplicate alerts every cycle.
     * The narrative is stored on the entity at creation time.
     */
    private void maybeCreateAlert(String siteId, String rule, String severity,
                                  String title, String description, String recordIds,
                                  String narrative) {
        maybeCreateAlertReturningId(siteId, rule, severity, title, description, recordIds, narrative);
    }

    private String maybeCreateAlertReturningId(String siteId, String rule, String severity,
                                  String title, String description, String recordIds,
                                  String narrative) {
        boolean alreadyActive = alertRepository
                .findFirstBySiteIdAndRuleAndStatus(siteId, rule, "active")
                .isPresent();

        if (alreadyActive) {
            log.debug("AlertRulesEngine: active alert already exists for site={} rule='{}' — skipping",
                    siteId, rule);
            return null;
        }

        AlertEntity alert = new AlertEntity();
        alert.setId(UUID.randomUUID().toString());
        alert.setSiteId(siteId);
        alert.setSeverity(severity);
        alert.setStatus("active");
        alert.setTitle(title);
        alert.setDescription(description);
        alert.setRule(rule);
        alert.setRecordIds(recordIds != null ? recordIds : "");
        alert.setCreatedAt(LocalDateTime.now());
        alert.setNarrative(narrative);
        alert.setNarrativeUpdatedAt(LocalDateTime.now());
        alert.setNarrativeIncidentCount(safeIncidentCount(siteId, 30));

        alertRepository.save(alert);
        log.info("AlertRulesEngine: created alert [{}] site={} rule='{}' narrative-length={}",
                alert.getId(), siteId, rule,
                narrative != null ? narrative.length() : 0);
        return alert.getId();
    }
}
