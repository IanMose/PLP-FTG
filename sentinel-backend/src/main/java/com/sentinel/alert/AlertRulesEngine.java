package com.sentinel.alert;

import com.sentinel.site.AuditEntity;
import com.sentinel.site.AuditRepository;
import com.sentinel.site.IncidentEntity;
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
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertRulesEngine {

    static final String RULE_HIGH_REJECT_RATE  = "Site rejection rate > 10%";
    static final String RULE_CRITICAL_CLUSTER  = "Critical incident cluster";
    static final String RULE_CRITICAL_HIGH_RISK = "Critical incident at high-risk site";
    static final String RULE_AUDIT_OVERDUE     = "Audit frequency threshold (14d for high-risk)";

    private static final Set<String> HIGH_RISK_SITES = Set.of("site-003", "site-006");
    private static final int AUDIT_OVERDUE_DAYS = 14;

    private final AlertRepository alertRepository;
    private final AuditRepository auditRepository;

    /**
     * Evaluate all rules against the newly ingested incidents and audits.
     * Called by EtlReloadService after each batch loads successfully.
     *
     * @param newIncidents incidents persisted in this reload cycle
     * @param newAudits    audits persisted in this reload cycle
     */
    @Transactional
    public void evaluate(List<IncidentEntity> newIncidents, List<IncidentEntity> allNewIncidentAttempts) {
        if (newIncidents == null) newIncidents = List.of();

        evaluateRejectionRate(newIncidents, allNewIncidentAttempts);
        evaluateCriticalCluster(newIncidents);
        evaluateCriticalHighRisk(newIncidents);
        evaluateAuditOverdue();
    }

    // ── Rule 1: High rejection rate ───────────────────────────────────────────

    private void evaluateRejectionRate(List<IncidentEntity> saved,
                                       List<IncidentEntity> attempted) {
        // Group attempted incidents by site (includes both saved and skipped-as-duplicate)
        // Use saved list only — attempted list gives us total count per site this batch
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

                maybeCreateAlert(
                        siteId,
                        RULE_HIGH_REJECT_RATE,
                        "High",
                        String.format("High rejection rate — %s", siteId),
                        String.format("%.0f%% of records rejected in latest batch at %s — exceeds 10%% site threshold.",
                                rate * 100, siteId),
                        recordIds
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
                String recordIds = entry.getValue().stream()
                        .map(IncidentEntity::getIncidentId)
                        .collect(Collectors.joining(","));

                maybeCreateAlert(
                        siteId,
                        RULE_CRITICAL_CLUSTER,
                        "Critical",
                        String.format("Critical incident cluster — %s", siteId),
                        String.format("%d Critical/High incidents ingested in a single batch at %s.",
                                entry.getValue().size(), siteId),
                        recordIds
                );
            }
        }
    }

    // ── Rule 3: Single Critical incident at high-risk site ────────────────────

    private void evaluateCriticalHighRisk(List<IncidentEntity> newIncidents) {
        newIncidents.stream()
                .filter(i -> HIGH_RISK_SITES.contains(i.getSiteId()))
                .filter(i -> "Critical".equalsIgnoreCase(i.getSeverity()))
                .forEach(i -> maybeCreateAlert(
                        i.getSiteId(),
                        RULE_CRITICAL_HIGH_RISK,
                        "Critical",
                        String.format("Critical incident at high-risk site — %s", i.getSiteId()),
                        String.format("Critical severity incident %s ingested at monitored high-risk site %s.",
                                i.getIncidentId(), i.getSiteId()),
                        i.getIncidentId()
                ));
    }

    // ── Rule 4: Audit overdue for high-risk sites ─────────────────────────────

    private void evaluateAuditOverdue() {
        // Build a map of siteId → latest audit date from the full audits table
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
                maybeCreateAlert(
                        siteId,
                        RULE_AUDIT_OVERDUE,
                        "High",
                        String.format("Audit overdue — %s", siteId),
                        String.format("Last audit was %d days ago. Threshold is %d days for high-risk sites.",
                                daysSince, AUDIT_OVERDUE_DAYS),
                        ""
                );
            }
        }
    }

    // ── Shared: deduplication + persist ──────────────────────────────────────

    /**
     * Creates and saves an alert only if no active alert already exists
     * for this site + rule combination — prevents duplicate alerts every cycle.
     */
    private void maybeCreateAlert(String siteId, String rule, String severity,
                                  String title, String description, String recordIds) {
        boolean alreadyActive = alertRepository
                .findFirstBySiteIdAndRuleAndStatus(siteId, rule, "active")
                .isPresent();

        if (alreadyActive) {
            log.debug("AlertRulesEngine: active alert already exists for site={} rule='{}' — skipping", siteId, rule);
            return;
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

        alertRepository.save(alert);
        log.info("AlertRulesEngine: created alert [{}] site={} rule='{}'", alert.getId(), siteId, rule);
    }
}
