package com.sentinel.alert;

import com.sentinel.site.AuditRepository;
import com.sentinel.site.IncidentEntity;
import com.sentinel.site.IncidentRepository;
import com.sentinel.telemetry.TelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * NarrativeService — generates rich, human-readable alert narratives at
 * alert-creation time, matching the exact KPC problem statement wording:
 * "proactive early-warning analytics and automated alert narratives."
 *
 * Each narrative template fills in live context variables (site name,
 * incident counts, audit overdue days, rejection rates, pressure spike data)
 * so the output reads like a safety officer wrote it — not a database row.
 *
 * Design principle: a safety officer opening the alert feed should be able
 * to read the narrative and know WHAT happened, WHY it matters, and WHAT to
 * do next — without opening a separate report.
 *
 * Four rule templates:
 *   1. RULE_HIGH_REJECT_RATE       → data integrity narrative with trend context
 *   2. RULE_CRITICAL_CLUSTER       → incident spike narrative with severity breakdown
 *   3. RULE_CRITICAL_HIGH_RISK     → Kimeu-watch-list narrative with historical pattern
 *   4. RULE_AUDIT_OVERDUE          → compliance gap narrative with escalating urgency
 *
 * Fallback: if any enrichment query fails, a sanitised plain narrative is
 * returned so no alert is ever saved with a null/empty narrative.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NarrativeService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("d MMM yyyy");

    private static final Map<String, String> SITE_DISPLAY_NAMES = Map.of(
        "site-001", "Nairobi Terminal (Embakasi)",
        "site-002", "Mombasa Terminal (Kipevu)",
        "site-003", "Makueni Pipeline Section",
        "site-004", "Nakuru Depot",
        "site-005", "Eldoret Terminal",
        "site-006", "Sinendet Pump Station",
        "site-007", "Kisumu Terminal"
    );

    // Kimeu v. KPC watch list — these sites mirror the Thange incident failure pattern
    private static final Set<String> KIMEU_WATCH_SITES = Set.of("site-003", "site-006");

    private final AuditRepository auditRepository;
    private final IncidentRepository incidentRepository;
    private final TelemetryRepository telemetryRepository;

    // ── Groq LLM config ───────────────────────────────────────────────────────
    // All fields have safe defaults — if groqApiKey is blank the LLM path is
    // skipped entirely and the templated narrative is returned as-is.

    @Value("${sentinel.llm.groq-api-key:}")
    private String groqApiKey;

    @Value("${sentinel.llm.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${sentinel.llm.timeout-ms:3000}")
    private int groqTimeoutMs;

    @Value("${sentinel.llm.enabled:true}")
    private boolean llmEnabled;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    private static final String LLM_SYSTEM_PROMPT =
        "You are a pipeline safety analyst writing alert narratives for Kenya Pipeline Company (KPC). " +
        "Rewrite the following safety alert narrative in clear, professional prose that a senior HSE officer " +
        "can act on immediately. Keep all facts, numbers, site names, incident IDs, and legal references exactly " +
        "as given. Do NOT add speculation or new information. Aim for 3-5 concise sentences. " +
        "Do not include greetings, headers, or sign-offs — return only the narrative text.";

    // ─────────────────────────────────────────────────────────────────────────
    //  Public API — one method per rule
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate a narrative for RULE_HAZARD_REPORT_RISK_RATING.
     */
    public String forHazardRiskRating(com.sentinel.hazard.HazardReportEntity report, String severity) {
        try {
            String site = displayName(report.getSiteId());
            int riskRating = report.getRiskRating() != null ? report.getRiskRating() : 0;
            int likelihood = report.getLikelihoodRating() != null ? report.getLikelihoodRating() : 0;
            int sev = report.getSeverityRating() != null ? report.getSeverityRating() : 0;
            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                "⚠ %s escalated to %s: hazard report received — category '%s', " +
                "risk rated %d/25 (likelihood %d/5 × severity %d/5). ",
                site, severity, report.getCategory(), riskRating, likelihood, sev));
            if (report.getMitigationNote() != null && !report.getMitigationNote().isBlank()) {
                sb.append(String.format("Assessor mitigation note: '%s'. ", report.getMitigationNote()));
            }
            sb.append("HSE Officer review and CAPA assignment required.");
            return enhanceWithLlm(sb.toString());
        } catch (Exception ex) {
            log.warn("NarrativeService: fallback narrative for HAZARD_REPORT site={}", report.getSiteId(), ex);
            return String.format("Hazard report risk assessment at %s: risk rating %d/25 — escalated to %s.",
                    displayName(report.getSiteId()),
                    report.getRiskRating() != null ? report.getRiskRating() : 0,
                    severity);
        }
    }

    /**
     * Generate a narrative for RULE_HIGH_REJECT_RATE.
     *
     * @param siteId      affected site
     * @param rejectedCount number of rejected records in this batch
     * @param totalCount    total records attempted for this site in this batch
     * @param rejectedIds   comma-separated record IDs that were rejected
     */
    public String forHighRejectRate(String siteId, long rejectedCount,
                                    long totalCount, String rejectedIds) {
        try {
            double rate = totalCount > 0 ? (double) rejectedCount / totalCount * 100 : 0.0;
            String site = displayName(siteId);
            long historicIncidents = safeIncidentCount(siteId, 30);
            long pressureSpikes = safePressureSpikeCount(siteId, 14);

            // Severity escalation language based on rate
            String urgencyLabel;
            String actionLine;
            if (rate >= 50.0) {
                urgencyLabel = "CRITICAL DATA FAILURE";
                actionLine = "Immediate data source investigation required. Reject rates above 50% indicate systematic corruption, sensor failure, or upstream data-feed breakdown.";
            } else if (rate >= 25.0) {
                urgencyLabel = "SEVERE DATA QUALITY DEGRADATION";
                actionLine = "Senior data steward review required within 4 hours. Pattern consistent with sensor drift or manual entry error cluster.";
            } else {
                urgencyLabel = "DATA QUALITY THRESHOLD BREACH";
                actionLine = "Data quality team review required within 24 hours to identify source of rejections and prevent escalation.";
            }

            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                "⚠ %s at %s. %.0f%% of the latest batch (%d of %d records) failed quality gates " +
                "and were rejected — exceeding the 10%% site rejection threshold. ",
                urgencyLabel, site, rate, rejectedCount, totalCount));

            if (historicIncidents > 0) {
                sb.append(String.format(
                    "This site has also recorded %d incident(s) in the past 30 days, indicating " +
                    "an active operational risk environment. ", historicIncidents));
            }

            if (pressureSpikes > 0) {
                sb.append(String.format(
                    "Telemetry shows %d pressure anomaly/anomalies in the last 14 days — " +
                    "data quality gaps alongside pressure irregularities significantly reduce early-warning reliability. ",
                    pressureSpikes));
            }

            sb.append(actionLine);

            if (rejectedIds != null && !rejectedIds.isBlank()) {
                String preview = Arrays.stream(rejectedIds.split(","))
                        .limit(3)
                        .collect(Collectors.joining(", "));
                long total = rejectedIds.split(",").length;
                sb.append(String.format(" Rejected record IDs: %s%s.",
                        preview, total > 3 ? String.format(" (+%d more)", total - 3) : ""));
            }

            return enhanceWithLlm(sb.toString());

        } catch (Exception ex) {
            log.warn("NarrativeService: fallback narrative for RULE_HIGH_REJECT_RATE site={}", siteId, ex);
            return String.format(
                "Data quality alert at %s: rejection rate exceeded 10%% threshold in latest batch. " +
                "Quality team review required.", displayName(siteId));
        }
    }

    /**
     * Generate a narrative for RULE_CRITICAL_CLUSTER.
     *
     * @param siteId    affected site
     * @param incidents the Critical/High incidents in this cluster
     */
    public String forCriticalCluster(String siteId, List<IncidentEntity> incidents) {
        try {
            String site = displayName(siteId);
            long criticalCount = incidents.stream()
                    .filter(i -> "Critical".equalsIgnoreCase(i.getSeverity()))
                    .count();
            long highCount = incidents.stream()
                    .filter(i -> "High".equalsIgnoreCase(i.getSeverity()))
                    .count();

            long totalPast30 = safeIncidentCount(siteId, 30);
            long pressureSpikes = safePressureSpikeCount(siteId, 14);
            Optional<String> latestAudit = safeLatestAuditDate(siteId);
            int daysSinceAudit = latestAudit.map(d -> {
                try {
                    LocalDate auditDate = LocalDate.parse(d.substring(0, 10));
                    return (int) ChronoUnit.DAYS.between(auditDate, LocalDate.now());
                } catch (Exception ignored) { return -1; }
            }).orElse(-1);

            boolean isKimeuWatch = KIMEU_WATCH_SITES.contains(siteId);

            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                "🚨 INCIDENT SPIKE DETECTED at %s. %d Critical/High-severity incident(s) " +
                "arrived in a single ingestion batch — %d Critical, %d High. " +
                "A cluster of this density exceeds normal operational variance and indicates " +
                "a rapidly deteriorating site condition. ",
                site, incidents.size(), criticalCount, highCount));

            if (totalPast30 > incidents.size()) {
                sb.append(String.format(
                    "Context: this site has logged %d total incident(s) in the past 30 days, " +
                    "suggesting a sustained — not isolated — risk pattern. ", totalPast30));
            }

            if (pressureSpikes > 0) {
                sb.append(String.format(
                    "Pressure telemetry confirms %d anomaly/anomalies in the last 14 days, " +
                    "corroborating the physical risk signal. ", pressureSpikes));
            }

            if (daysSinceAudit > 0) {
                String auditUrgency = daysSinceAudit > 30 ? "significantly overdue" :
                                      daysSinceAudit > 14 ? "overdue" : "recent";
                sb.append(String.format(
                    "Last compliance audit was %d days ago (%s). ",
                    daysSinceAudit, auditUrgency));
            }

            if (isKimeuWatch) {
                sb.append(
                    "⚑ KIMEU WATCH LIST: this site is on the Sentinel high-risk registry " +
                    "mirroring the Makueni/Thange failure pattern (Kimeu v. KPC, [2025] KEELC 5239). " +
                    "Escalation to HSE Manager required immediately. ");
            }

            sb.append("Recommended action: dispatch field assessment team, cross-reference with " +
                      "pressure telemetry, and escalate to HSE Manager if not already notified.");

            return enhanceWithLlm(sb.toString());

        } catch (Exception ex) {
            log.warn("NarrativeService: fallback narrative for RULE_CRITICAL_CLUSTER site={}", siteId, ex);
            return String.format(
                "Critical incident cluster at %s: %d Critical/High incidents detected in single batch. " +
                "Field assessment required immediately.", displayName(siteId),
                incidents != null ? incidents.size() : 0);
        }
    }

    /**
     * Generate a narrative for RULE_CRITICAL_HIGH_RISK.
     *
     * @param siteId     affected site (always on the Kimeu watch list)
     * @param incident   the triggering Critical incident
     */
    public String forCriticalHighRisk(String siteId, IncidentEntity incident) {
        try {
            String site = displayName(siteId);
            long totalPast30 = safeIncidentCount(siteId, 30);
            long pressureSpikes = safePressureSpikeCount(siteId, 14);
            Optional<String> latestAudit = safeLatestAuditDate(siteId);
            int daysSinceAudit = latestAudit.map(d -> {
                try {
                    LocalDate auditDate = LocalDate.parse(d.substring(0, 10));
                    return (int) ChronoUnit.DAYS.between(auditDate, LocalDate.now());
                } catch (Exception ignored) { return -1; }
            }).orElse(-1);

            String incidentRef = incident != null ? incident.getIncidentId() : "unknown";
            String incidentDesc = incident != null && incident.getDescription() != null
                    ? incident.getDescription()
                    : "Critical severity incident";

            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                "🔴 CRITICAL INCIDENT — HIGH-RISK SITE: %s. " +
                "Incident %s (Critical severity) has been detected at a Sentinel-monitored " +
                "high-risk facility. This site is on the KPC Watch List due to historical " +
                "failure patterns consistent with the Makueni/Thange pipeline incident " +
                "(Kimeu & 3074 others v. Kenya Pipeline Company Ltd, [2025] KEELC 5239 — " +
                "gross judgment KES 3.02B). ",
                site, incidentRef));

            sb.append(String.format("Incident description: %s. ", incidentDesc));

            if (totalPast30 > 1) {
                sb.append(String.format(
                    "This is incident %d at this site in the past 30 days — " +
                    "frequency alone justifies immediate escalation. ", totalPast30));
            }

            if (pressureSpikes > 0) {
                sb.append(String.format(
                    "⚡ Telemetry corroboration: %d pressure anomaly/anomalies recorded in the " +
                    "last 14 days. The Thange spill (2015) was preceded by escalating pressure " +
                    "irregularities that went unescalated for weeks — Sentinel has flagged this " +
                    "combination as the highest-priority early-warning pattern. ",
                    pressureSpikes));
            }

            if (daysSinceAudit >= 14) {
                sb.append(String.format(
                    "⚠ Audit overdue: last inspection was %d days ago (threshold: 14 days for " +
                    "high-risk sites). Combined with this critical incident, this represents a " +
                    "compounded compliance gap. ", daysSinceAudit));
            } else if (daysSinceAudit > 0) {
                sb.append(String.format(
                    "Last audit: %d days ago (within threshold). ", daysSinceAudit));
            }

            sb.append("MANDATORY ESCALATION: notify HSE Manager and Site Operations Lead immediately. " +
                      "Field verification required within 2 hours per KPC high-risk site protocol.");

            return enhanceWithLlm(sb.toString());

        } catch (Exception ex) {
            log.warn("NarrativeService: fallback narrative for RULE_CRITICAL_HIGH_RISK site={}", siteId, ex);
            return String.format(
                "Critical incident at high-risk site %s. Immediate HSE Manager notification required. " +
                "Site is on the KPC Watch List (Kimeu v. KPC, [2025] KEELC 5239).",
                displayName(siteId));
        }
    }

    /**
     * Generate a narrative for RULE_AUDIT_OVERDUE.
     *
     * @param siteId       affected site (always on the Kimeu watch list)
     * @param daysSince    how many days since the last audit (999 = never audited)
     */
    public String forAuditOverdue(String siteId, int daysSince) {
        try {
            String site = displayName(siteId);
            long totalPast30 = safeIncidentCount(siteId, 30);
            long pressureSpikes = safePressureSpikeCount(siteId, 14);
            boolean isKimeuWatch = KIMEU_WATCH_SITES.contains(siteId);

            String overdueDescription;
            String escalationLevel;
            if (daysSince >= 999) {
                overdueDescription = "NO AUDIT ON RECORD";
                escalationLevel = "CRITICAL COMPLIANCE GAP";
            } else if (daysSince >= 60) {
                overdueDescription = String.format("%d days overdue (%.1fx the 14-day threshold)",
                        daysSince, (double) daysSince / 14);
                escalationLevel = "CRITICAL COMPLIANCE GAP";
            } else if (daysSince >= 30) {
                overdueDescription = String.format("%d days overdue (%.1fx the 14-day threshold)",
                        daysSince, (double) daysSince / 14);
                escalationLevel = "SEVERE COMPLIANCE BREACH";
            } else {
                overdueDescription = String.format("%d days since last audit (%d days overdue)",
                        daysSince, daysSince - 14);
                escalationLevel = "COMPLIANCE THRESHOLD EXCEEDED";
            }

            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                "📋 %s — %s. " +
                "High-risk sites on the Sentinel watch list must be audited every 14 days. " +
                "The last recorded inspection at %s was %s. ",
                escalationLevel, site, site, overdueDescription));

            if (isKimeuWatch) {
                sb.append(
                    "⚑ KIMEU WATCH LIST: audit failures at this site class contributed directly " +
                    "to the Makueni/Thange spill (12 May 2015) and the subsequent KES 3.02B " +
                    "court judgment (Kimeu v. KPC, [2025] KEELC 5239). KPC's own court record " +
                    "shows that ignored/delayed audit findings are the primary liability vector. ");
            }

            if (totalPast30 > 0) {
                sb.append(String.format(
                    "Compounding factor: %d incident(s) have been logged at this site in the " +
                    "last 30 days while the audit gap has been accumulating. ",
                    totalPast30));
            }

            if (pressureSpikes > 0) {
                sb.append(String.format(
                    "Telemetry shows %d pressure anomaly/anomalies in the last 14 days — " +
                    "without a recent audit, there is no verified baseline for these readings. ",
                    pressureSpikes));
            }

            sb.append("Required action: schedule and conduct audit within 48 hours. " +
                      "Document all open findings in compliance system and assign closure dates. " +
                      "Notify Regional HSE Coordinator if audit cannot be completed within 48 hours.");

            return enhanceWithLlm(sb.toString());

        } catch (Exception ex) {
            log.warn("NarrativeService: fallback narrative for RULE_AUDIT_OVERDUE site={}", siteId, ex);
            int days = daysSince == 999 ? -1 : daysSince;
            return String.format(
                "Audit overdue at high-risk site %s. %s. " +
                "Compliance audit required immediately per 14-day high-risk site protocol.",
                displayName(siteId),
                days > 0 ? "Last audit " + days + " days ago" : "No audit on record");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LLM enhancement — Groq API with template fallback
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Attempts to rewrite a templated narrative through the Groq LLM API.
     * Returns the LLM-enhanced text on success, or the original template on
     * any failure (timeout, API error, blank response, key not configured).
     *
     * Hard timeout: 3 seconds. Alert creation is never blocked by this call.
     */
    private String enhanceWithLlm(String templateNarrative) {
        if (!llmEnabled || groqApiKey == null || groqApiKey.isBlank()) {
            return templateNarrative;
        }
        try {
            RestTemplate restTemplate = new RestTemplate();

            // Set connection + read timeout via request factory
            org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                    new org.springframework.http.client.SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(groqTimeoutMs);
            factory.setReadTimeout(groqTimeoutMs);
            restTemplate.setRequestFactory(factory);

            // Build request body — OpenAI-compatible chat completions format
            Map<String, Object> userMessage = Map.of(
                "role", "user",
                "content", templateNarrative
            );
            Map<String, Object> systemMessage = Map.of(
                "role", "system",
                "content", LLM_SYSTEM_PROMPT
            );
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", groqModel);
            body.put("messages", List.of(systemMessage, userMessage));
            body.put("max_tokens", 400);
            body.put("temperature", 0.3);  // low temperature = factual, consistent

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(GROQ_URL, request, Map.class);

            if (response == null) return templateNarrative;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return templateNarrative;

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) return templateNarrative;

            String content = (String) message.get("content");
            if (content == null || content.isBlank()) return templateNarrative;

            log.info("NarrativeService: LLM enhancement succeeded ({} chars → {} chars)",
                    templateNarrative.length(), content.length());
            return content.trim();

        } catch (Exception ex) {
            // Any failure — timeout, rate limit, network error — falls back silently
            log.debug("NarrativeService: LLM enhancement failed (using template fallback): {}", ex.getMessage());
            return templateNarrative;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String displayName(String siteId) {
        return SITE_DISPLAY_NAMES.getOrDefault(siteId,
                siteId != null ? siteId.toUpperCase() : "Unknown Site");
    }

    private long safeIncidentCount(String siteId, int days) {
        try {
            LocalDateTime since = LocalDateTime.now().minusDays(days);
            return incidentRepository.countBySiteIdAndIncidentDateAfter(siteId, since);
        } catch (Exception ex) {
            log.debug("NarrativeService: could not query incident count for site={}", siteId);
            return 0L;
        }
    }

    private long safePressureSpikeCount(String siteId, int days) {
        try {
            LocalDateTime since = LocalDateTime.now().minusDays(days);
            return telemetryRepository.countPressureSpikesForSiteSince(siteId, since);
        } catch (Exception ex) {
            log.debug("NarrativeService: could not query pressure spikes for site={}", siteId);
            return 0L;
        }
    }

    private Optional<String> safeLatestAuditDate(String siteId) {
        try {
            return auditRepository.findLatestAuditDateBySite().stream()
                    .filter(row -> siteId.equals(row[0]))
                    .findFirst()
                    .map(row -> row[1] != null ? row[1].toString() : null);
        } catch (Exception ex) {
            log.debug("NarrativeService: could not query audit date for site={}", siteId);
            return Optional.empty();
        }
    }
}
