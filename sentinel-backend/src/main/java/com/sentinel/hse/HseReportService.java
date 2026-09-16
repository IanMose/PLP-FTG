package com.sentinel.hse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinel.actuation.ActuationService;
import com.sentinel.alert.AlertRepository;
import com.sentinel.capa.CapaRepository;
import com.sentinel.event.EventEntity;
import com.sentinel.event.EventRepository;
import com.sentinel.event.EventService;
import com.sentinel.quality.QualityService;
import com.sentinel.site.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * HseReportService — AI HSE Reporting Agent.
 *
 * Transforms raw Sentinel operational data into a structured, professional
 * HSE Incident & Sustainability Impact Report across three workflows:
 *
 *   1. Context Assembly  — pulls live data from 6 existing services
 *   2. LLM Generation    — sends structured context to Groq, gets JSON report
 *   3. Persistence       — saves as HseReportEntity (status=DRAFT)
 *
 * The report covers 15 sections as defined in the HSE agent specification:
 *   Executive Summary, Incident Overview, Narrative, HSE Risk Assessment,
 *   Timeline, Root Cause Analysis, CAPA Recommendations, Environmental
 *   Impact, Community & Social Impact, HSE KPIs, ESG Connection, ESG Data
 *   Table, Management Insights, Early Warning Signals, Reporting Confidence.
 *
 * Design principles (mirrors AiCapaService):
 * - Falls back to a structured template if LLM is unavailable — no crash
 * - 8-second timeout for HSE reports (longer than CAPA — more content)
 * - Never presents AI output as confirmed fact — all hypotheses labelled
 * - Human-in-the-loop: report status starts as DRAFT, requires approval
 * - Sinai (2011) and Thange/Kimeu context injected for high-risk sites
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HseReportService {

    private final HseReportRepository hseReportRepository;
    private final EventRepository     eventRepository;
    private final ActuationService    actuationService;
    private final IncidentRepository  incidentRepository;
    private final AlertRepository     alertRepository;
    private final CapaRepository      capaRepository;
    private final QualityService      qualityService;
    private final EventService        eventService;
    private final ObjectMapper        objectMapper;

    @Value("${sentinel.llm.groq-api-key:}")
    private String groqApiKey;

    @Value("${sentinel.llm.model:openai/gpt-oss-20b}")
    private String groqModel;

    @Value("${sentinel.llm.enabled:true}")
    private boolean llmEnabled;

    private static final String GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
    private static final int    TIMEOUT_MS  = 20000; // 70b model needs more time
    private static final int    MAX_TOKENS  = 4096;  // raised from 2000 — full 15-section report needs space

    // Use the 70b model for full HSE reports — significantly better structured JSON and legal language
    private static final String REPORT_MODEL = "openai/gpt-oss-120b";

    private static final Set<String> HIGH_RISK_SITES = Set.of("site-003", "site-006");

    private static final Map<String, String> SITE_DISPLAY_NAMES = Map.of(
        "site-001", "Nairobi Terminal (Embakasi)",
        "site-002", "Mombasa Terminal (Kipevu)",
        "site-003", "Makueni Pipeline Section (Thange Corridor)",
        "site-004", "Nakuru Depot",
        "site-005", "Eldoret Terminal",
        "site-006", "Sinendet Pump Station",
        "site-007", "Kisumu Terminal"
    );

    // ── LLM System Prompt ─────────────────────────────────────────────────────

    private static final String HSE_SYSTEM_PROMPT = """
        You are the Sentinel HSE Reporting Agent — an AI assistant that transforms pipeline safety \
        operational data into professional HSE Incident & Sustainability Impact Reports for Kenya \
        Pipeline Company (KPC).

        AUDIENCE: HSE managers, environmental officers, ESG teams, auditors, and senior executives.

        CRITICAL RULES:
        - Never invent telemetry values. Use ONLY values from the context provided.
        - Never confirm environmental damage, injuries, fatalities, or financial losses unless stated.
        - Never present root cause as confirmed. Label ALL causal analysis as AI hypothesis.
        - Never claim legal liability.
        - Clearly label missing info as: "Requires HSE verification"
        - Separate confirmed facts from analysis everywhere.
        - Use professional HSE language. Be precise, evidence-based, and actionable.
        - Keep the Sinai 2011 and Thange/Kimeu references factual and professional.

        Generate the report as a single JSON object with this exact structure:
        {
          "executiveSummary": {
            "headline": "one sentence — what happened and where",
            "whatHappened": "2-3 sentences for a senior executive with no telemetry knowledge",
            "severity": "CRITICAL|HIGH|MEDIUM|LOW",
            "immediateRisk": "concise statement",
            "environmentalImpactOccurred": false,
            "sentinelResponse": "what Sentinel did and in how long",
            "responseTimeSeconds": 0.0,
            "currentStatus": "current state",
            "keyActions": ["action1", "action2", "action3"]
          },
          "narrative": {
            "whatSystemDetected": "...",
            "whyConditionWasAbnormal": "...",
            "whatRiskItCreated": "...",
            "whatSentinelDid": "...",
            "whatHappenedAfterIntervention": "..."
          },
          "hseRiskAssessment": {
            "healthAndSafety": "concise assessment paragraph",
            "environmental": "assessment — if no confirmed release, say so explicitly",
            "community": "assessment — distinguish potential from actual impact",
            "operational": "equipment and downtime assessment",
            "legalAndCompliance": "regulatory exposure summary — no liability claims"
          },
          "rootCauseAnalysis": {
            "disclaimer": "AI-generated hypothesis only. Human HSE investigation required.",
            "confirmedFacts": ["fact1", "fact2"],
            "aiHypotheses": ["hypothesis1", "hypothesis2"],
            "requiresInvestigation": ["item1", "item2"]
          },
          "capaRecommendations": [
            {
              "action": "...",
              "reason": "...",
              "responsibleRole": "...",
              "priority": "CRITICAL|HIGH|MEDIUM|LOW",
              "suggestedDeadlineDays": 1,
              "verificationMethod": "..."
            }
          ],
          "environmentalImpactAssessment": "If no confirmed release, explicitly state: No confirmed environmental release. Assessment requires field verification.",
          "communityAndSocialImpact": "...",
          "managementInsights": ["insight1 — data-based pattern", "insight2"],
          "earlyWarningSignals": ["signal1", "signal2"],
          "esgConnection": {
            "environmental": ["relevant ESG-E metric or finding"],
            "social": ["relevant ESG-S metric or finding"],
            "governance": ["relevant ESG-G metric or finding"]
          },
          "timeline": [
            { "time": "T+0s", "event": "description of what happened at this step", "type": "detect|response|action|status" },
            { "time": "T+Xs", "event": "automated response step", "type": "response" },
            { "time": "Pending", "event": "next required action", "type": "action" }
          ]
        }

        Return ONLY valid JSON. No markdown fences, no preamble, no explanation outside the JSON.
        """;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Generate and persist an HSE report for the given event ID.
     * Returns the saved DRAFT report entity.
     */
    @Transactional
    public HseReportEntity generateReport(String eventId) {
        EventEntity event = eventRepository.findById(eventId)
            .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));

        log.info("HseReportService: generating HSE report for eventId={}, site={}, severity={}",
            eventId, event.getSiteId(), event.getSeverity());

        // Check if a report already exists for this event — return existing DRAFT
        Optional<HseReportEntity> existing =
            hseReportRepository.findFirstBySourceEventIdOrderByGeneratedAtDesc(eventId);
        if (existing.isPresent() && HseReportEntity.STATUS_DRAFT.equals(existing.get().getStatus())) {
            log.info("HseReportService: returning existing DRAFT report for eventId={}", eventId);
            return existing.get();
        }

        // Assemble full context
        String context = assembleContext(event);

        // Generate report JSON via LLM or template
        String reportJson;
        boolean aiGenerated;
        try {
            String llmJson = callGroq(context);
            reportJson  = llmJson != null ? llmJson : buildTemplateReport(event, context);
            aiGenerated = llmJson != null;
        } catch (Exception ex) {
            log.warn("HseReportService: LLM failed, using template: {}", ex.getMessage());
            reportJson  = buildTemplateReport(event, context);
            aiGenerated = false;
        }

        // Extract headline from JSON for the list view
        String headline = extractHeadline(reportJson, event);

        HseReportEntity report = HseReportEntity.create(
            eventId,
            event.getSiteId(),
            event.getSeverity(),
            headline,
            reportJson,
            aiGenerated
        );

        HseReportEntity saved = hseReportRepository.save(report);
        log.info("HseReportService: saved {} report {} for event {}",
            aiGenerated ? "AI-generated" : "template", saved.getReportId(), eventId);
        return saved;
    }

    /**
     * Generate an HSE report directly from alert data — used when no event record exists.
     * Builds a context from the alert's narrative, site, severity, and rule, then calls
     * the same LLM/template pipeline as generateReport.
     */
    @Transactional
    public HseReportEntity generateFromAlert(com.sentinel.alert.AlertEntity alert) {
        log.info("HseReportService: generating HSE report from alert alertId={}, site={}, severity={}",
            alert.getId(),
            alert.getSiteId(), alert.getSeverity());

        // Check if a report already exists for this alert
        String alertId = alert.getId();
        Optional<HseReportEntity> existing =
            hseReportRepository.findFirstBySourceEventIdOrderByGeneratedAtDesc("alert:" + alertId);
        if (existing.isPresent() && HseReportEntity.STATUS_DRAFT.equals(existing.get().getStatus())) {
            log.info("HseReportService: returning existing DRAFT for alertId={}", alertId);
            return existing.get();
        }

        String context = assembleContextFromAlert(alert);

        String reportJson;
        boolean aiGenerated;
        try {
            String llmJson = callGroq(context);
            reportJson  = llmJson != null ? llmJson : buildTemplateReportFromAlert(alert);
            aiGenerated = llmJson != null;
        } catch (Exception ex) {
            log.warn("HseReportService: LLM failed for alert, using template: {}", ex.getMessage());
            reportJson  = buildTemplateReportFromAlert(alert);
            aiGenerated = false;
        }

        String headline = extractHeadlineFromJson(reportJson, alert);

        HseReportEntity report = HseReportEntity.create(
            "alert:" + alertId,
            alert.getSiteId(),
            alert.getSeverity(),
            headline,
            reportJson,
            aiGenerated
        );

        HseReportEntity saved = hseReportRepository.save(report);
        log.info("HseReportService: saved {} alert-based report {} for alertId={}",
            aiGenerated ? "AI-generated" : "template", saved.getReportId(), alertId);
        return saved;
    }

    /**
     * Approve a report — sets status to APPROVED, records reviewer, triggers ESG promotion.
     */
    @Transactional
    public HseReportEntity approveReport(String reportId, String reviewedBy, String notes) {
        HseReportEntity report = hseReportRepository.findById(reportId)
            .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        report.setStatus(HseReportEntity.STATUS_APPROVED);
        report.setReviewedBy(reviewedBy);
        report.setReviewedAt(LocalDateTime.now());
        if (notes != null && !notes.isBlank()) {
            report.setHumanNotes(notes);
        }

        HseReportEntity saved = hseReportRepository.save(report);
        log.info("HseReportService: report {} approved by {}", reportId, reviewedBy);
        return saved;
    }

    /**
     * Reject a report with required notes explaining why.
     */
    @Transactional
    public HseReportEntity rejectReport(String reportId, String reviewedBy, String notes) {
        HseReportEntity report = hseReportRepository.findById(reportId)
            .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        report.setStatus(HseReportEntity.STATUS_REJECTED);
        report.setReviewedBy(reviewedBy);
        report.setReviewedAt(LocalDateTime.now());
        report.setHumanNotes(notes);

        HseReportEntity saved = hseReportRepository.save(report);
        log.info("HseReportService: report {} rejected by {}", reportId, reviewedBy);
        return saved;
    }

    // ── Context Assembly ──────────────────────────────────────────────────────

    /**
     * Assembles a rich structured context string from all available Sentinel data.
     * This is what gets sent to the LLM as the "user" message.
     */
    private String assembleContext(EventEntity event) {
        LocalDateTime since30d  = LocalDateTime.now().minusDays(30);
        LocalDateTime since90d  = LocalDateTime.now().minusDays(90);
        String siteId  = event.getSiteId();
        String siteName = displayName(siteId);

        StringBuilder sb = new StringBuilder();

        // ── Incident facts ────────────────────────────────────────────────────
        sb.append("=== INCIDENT FACTS ===\n");
        sb.append("Event ID: ").append(event.getEventId()).append("\n");
        sb.append("Site: ").append(siteName).append("\n");
        sb.append("Tank: ").append(event.getTankId() != null ? event.getTankId() : "Not specified").append("\n");
        sb.append("Severity: ").append(event.getSeverity()).append("\n");
        sb.append("Event Type: ").append(event.getEventType()).append("\n");
        sb.append("Detection Time: ").append(
            event.getCreatedAt() != null
                ? event.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss"))
                : "Not recorded").append(" UTC\n");

        if (event.getSignalValue() != null) {
            sb.append("Tank Level at Detection: ").append(event.getSignalValue().toPlainString()).append("%\n");
        }
        if (event.getThresholdValue() != null) {
            sb.append("Critical Threshold: ").append(event.getThresholdValue().toPlainString()).append("%\n");
        }
        if (event.getSignalValue() != null && event.getThresholdValue() != null) {
            double excess = event.getSignalValue().doubleValue() - event.getThresholdValue().doubleValue();
            sb.append("Threshold Excess: ").append(String.format("%.2f", excess)).append(" percentage points\n");
        }

        // ── Automated response ────────────────────────────────────────────────
        sb.append("\n=== AUTOMATED RESPONSE ===\n");
        if (Boolean.TRUE.equals(event.getActuationTriggered())) {
            sb.append("Valve Shutdown: TRIGGERED by Sentinel automated control plane\n");
            try {
                var actuationOpt = actuationService.getActuationByEvent(event.getEventId());
                actuationOpt.ifPresentOrElse(a -> {
                    sb.append("Actuation ID: ").append(a.getActuationId()).append("\n");
                    if (a.getLatencyMs() != null) {
                        sb.append("Response Time: ").append(
                            String.format("%.1f", a.getLatencyMs() / 1000.0)).append(" seconds\n");
                    }
                    sb.append("Actuation Status: ").append(a.getStatus()).append("\n");
                }, () -> sb.append("Actuation record: Not retrieved\n"));
            } catch (Exception ex) {
                sb.append("Actuation details: Could not retrieve\n");
            }
        } else {
            sb.append("Valve Shutdown: Not triggered / Not applicable\n");
        }

        // ── Site history ──────────────────────────────────────────────────────
        sb.append("\n=== SITE HISTORY (30 DAYS) ===\n");
        try {
            long incidents30d = incidentRepository.countBySiteIdAndIncidentDateAfter(siteId, since30d);
            long incidents90d = incidentRepository.countBySiteIdAndIncidentDateAfter(siteId, since90d);
            long nearMisses   = incidentRepository.countBySiteIdAndSeverityInAndIncidentDateAfter(
                siteId, List.of("Near Miss", "Low", "near_miss"), since30d);
            sb.append("Incidents at this site (last 30 days): ").append(incidents30d).append("\n");
            sb.append("Incidents at this site (last 90 days): ").append(incidents90d).append("\n");
            sb.append("Near-misses at this site (last 30 days): ").append(nearMisses).append("\n");
        } catch (Exception ex) {
            sb.append("Site incident history: Could not retrieve\n");
        }

        // ── CAPA status ───────────────────────────────────────────────────────
        sb.append("\n=== CAPA STATUS ===\n");
        try {
            long capaCreated  = capaRepository.countCreatedSince(since30d);
            Long capaClosed   = capaRepository.countClosed();
            Long capaOverdue  = capaRepository.countOverdue(LocalDate.now());
            Double avgDays    = capaRepository.avgClosureDays();
            sb.append("CAPAs created (last 30 days): ").append(capaCreated).append("\n");
            sb.append("CAPAs closed (total): ").append(capaClosed != null ? capaClosed : 0).append("\n");
            sb.append("CAPAs overdue: ").append(capaOverdue != null ? capaOverdue : 0).append("\n");
            sb.append("Average CAPA closure time: ").append(
                avgDays != null ? String.format("%.1f days", avgDays) : "No closures recorded").append("\n");
        } catch (Exception ex) {
            sb.append("CAPA data: Could not retrieve\n");
        }

        // ── Alert status ──────────────────────────────────────────────────────
        sb.append("\n=== ALERT STATUS ===\n");
        try {
            long openAlerts = alertRepository.findByStatusOrderByCreatedAtDesc("active").size();
            long ackAlerts  = alertRepository.findByStatusOrderByCreatedAtDesc("acknowledged").size();
            sb.append("Open (unacknowledged) alerts: ").append(openAlerts).append("\n");
            sb.append("Acknowledged alerts: ").append(ackAlerts).append("\n");
        } catch (Exception ex) {
            sb.append("Alert data: Could not retrieve\n");
        }

        // ── Period KPIs ───────────────────────────────────────────────────────
        sb.append("\n=== HSE KPIs (LAST 30 DAYS) ===\n");
        try {
            long overfillEvents  = eventService.countOverfillEvents(since30d);
            long valveClosures   = actuationService.countSuccessfulClosures(since30d);
            Double avgLatency    = actuationService.getAverageLatency(since30d);
            Double successRate   = actuationService.getSuccessRate(since30d);
            long litresSaved     = actuationService.calculateLitresSaved(since30d);
            long kesSaved        = actuationService.calculateKesSaved(since30d);
            sb.append("Overfill events detected: ").append(overfillEvents).append("\n");
            sb.append("Automated valve closures: ").append(valveClosures).append("\n");
            sb.append("Avg automated response time: ").append(
                avgLatency != null ? String.format("%.2f seconds", avgLatency / 1000.0) : "N/A").append("\n");
            sb.append("Automation success rate: ").append(
                successRate != null ? String.format("%.1f%%", successRate) : "N/A").append("\n");
            sb.append("Estimated litres saved: ").append(litresSaved).append("L\n");
            sb.append("Estimated KES value saved: KES ").append(String.format("%,d", kesSaved)).append("\n");
        } catch (Exception ex) {
            sb.append("KPI data: Could not retrieve\n");
        }

        // ── Data quality ──────────────────────────────────────────────────────
        sb.append("\n=== DATA QUALITY ===\n");
        try {
            var quality = qualityService.getSummary();
            sb.append("Data quality pass rate: ").append(
                String.format("%.1f%%", quality.getPassRate() * 100)).append("\n");
            sb.append("Gate status: ").append(quality.getGateStatus()).append("\n");
            sb.append("Total records processed: ").append(quality.getTotal()).append("\n");
        } catch (Exception ex) {
            sb.append("Data quality: Could not retrieve\n");
        }

        // ── High-risk site context ────────────────────────────────────────────
        if (HIGH_RISK_SITES.contains(siteId)) {
            sb.append("\n=== HIGH-RISK SITE CONTEXT ===\n");
            if ("site-003".equals(siteId)) {
                sb.append("THANGE CORRIDOR WATCH SITE: This is the Makueni Pipeline Section.\n");
                sb.append("The 2015 Thange spill resulted from an undetected valve/tank failure.\n");
                sb.append("Court judgment: Kimeu & 3,074 others v. Kenya Pipeline Company Ltd ");
                sb.append("([2025] KEELC 5239). Gross award: KES 3.02 billion.\n");
                sb.append("The spill ran for hours before action was taken — Sentinel's automated ");
                sb.append("response closed the valve in seconds at this exact class of incident.\n");
            }
            sb.append("SINAI REFERENCE: The 2011 Nairobi Sinai pipeline fire killed approximately ");
            sb.append("100 people. It began as an undetected valve failure at a KPC storage tank. ");
            sb.append("Both incidents share the same root pattern: physical failure went undetected ");
            sb.append("because no system was continuously monitoring tank level and valve status.\n");
        }

        // ── Report period ─────────────────────────────────────────────────────
        sb.append("\n=== REPORT CONTEXT ===\n");
        sb.append("Report generated: ").append(LocalDateTime.now().format(
            DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))).append(" UTC\n");
        sb.append("Reporting period: ").append(since30d.format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
        sb.append(" to ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))).append("\n");
        sb.append("System: Sentinel AI HSE Agent — report is a DRAFT for HSE professional review.\n");
        sb.append("Human verification required before external use.\n");

        return sb.toString();
    }

    // ── LLM Call ──────────────────────────────────────────────────────────────

    private String callGroq(String context) {
        if (!llmEnabled || groqApiKey == null || groqApiKey.isBlank()) {
            return null;
        }

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        RestTemplate restTemplate = new RestTemplate(factory);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", REPORT_MODEL);  // 70b for full HSE reports
        body.put("messages", List.of(
            Map.of("role", "system", "content", HSE_SYSTEM_PROMPT),
            Map.of("role", "user",   "content", context)
        ));
        body.put("max_tokens", MAX_TOKENS);
        body.put("temperature", 0.2);
        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                GROQ_URL, new HttpEntity<>(body, headers), Map.class);

            if (response == null) return null;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) return null;

            String content = (String) message.get("content");
            if (content == null || content.isBlank()) return null;

            // Validate it's parseable JSON before returning
            objectMapper.readTree(content);
            log.info("HseReportService: LLM report generated ({} chars)", content.length());
            return content.trim();

        } catch (Exception ex) {
            log.warn("HseReportService: Groq call failed: {}", ex.getMessage());
            return null;
        }
    }

    // ── Template Fallback ─────────────────────────────────────────────────────

    /**
     * Structured fallback report when LLM is unavailable.
     * Returns valid JSON matching the same schema as the LLM output.
     */
    private String buildTemplateReport(EventEntity event, String context) {
        String site     = displayName(event.getSiteId());
        String severity = event.getSeverity() != null ? event.getSeverity() : "High";
        String tankId   = event.getTankId() != null ? event.getTankId() : "Unknown tank";
        String level    = event.getSignalValue() != null
                          ? event.getSignalValue().toPlainString() + "%" : "threshold exceeded";
        boolean highRisk = HIGH_RISK_SITES.contains(event.getSiteId());

        String thangeNote = highRisk
            ? " This site shares the failure profile of the Makueni/Thange incident (Kimeu v. KPC, KES 3.02B)."
            : "";

        Map<String, Object> report = new LinkedHashMap<>();

        // Executive Summary
        Map<String, Object> exec = new LinkedHashMap<>();
        exec.put("headline", severity + " overfill condition detected at " + tankId + ", " + site);
        exec.put("whatHappened",
            "An overfill condition was detected at " + tankId + " (" + site + ") with tank level at " +
            level + ". The valve was open at time of detection." +
            (Boolean.TRUE.equals(event.getActuationTriggered())
                ? " Sentinel triggered an automated valve shutdown." : "") + thangeNote);
        exec.put("severity", severity.toUpperCase());
        exec.put("immediateRisk", "Potential fuel overflow with environmental and safety implications.");
        exec.put("environmentalImpactOccurred", false);
        exec.put("sentinelResponse",
            Boolean.TRUE.equals(event.getActuationTriggered())
                ? "Automated valve shutdown triggered by Sentinel control plane."
                : "Incident recorded and HSE notification issued.");
        exec.put("responseTimeSeconds", 0.0);
        exec.put("currentStatus", "OPEN — pending HSE investigation and field verification.");
        exec.put("keyActions", List.of(
            "Physically verify valve closure and tank level",
            "Conduct site inspection within 24 hours",
            "Initiate CAPA and assign to responsible HSE officer",
            "Review open audit findings at this site"));
        report.put("executiveSummary", exec);

        // Narrative
        Map<String, Object> narrative = new LinkedHashMap<>();
        narrative.put("whatSystemDetected",
            "Sentinel detected tank " + tankId + " at " + site + " had reached " + level +
            " with the inlet valve in the open position.");
        narrative.put("whyConditionWasAbnormal",
            "The reading exceeded the configured critical threshold. An overfill condition at this level" +
            " poses an immediate risk of fuel overflow.");
        narrative.put("whatRiskItCreated",
            "Potential fuel release into the surrounding area with environmental contamination risk" +
            (highRisk ? " — particularly significant given proximity to the Thange River corridor." : "."));
        narrative.put("whatSentinelDid",
            Boolean.TRUE.equals(event.getActuationTriggered())
                ? "Sentinel automatically issued a valve shutdown command via the control plane."
                : "Sentinel recorded the incident and issued an HSE notification.");
        narrative.put("whatHappenedAfterIntervention",
            "Physical site verification is required to confirm valve status and rule out any release.");
        report.put("narrative", narrative);

        // HSE Risk Assessment
        Map<String, Object> risk = new LinkedHashMap<>();
        risk.put("healthAndSafety",
            "Worker safety risk exists due to potential fuel overflow and ignition hazard. " +
            "Emergency response procedures should be confirmed active.");
        risk.put("environmental",
            "No confirmed environmental release. Potential soil and waterway contamination risk " +
            "if overflow occurred before shutdown." +
            (highRisk ? " Thange River corridor proximity elevates environmental risk classification." : "") +
            " Environmental impact assessment requires field verification.");
        risk.put("community",
            "Potential community exposure risk. Confirmed community impact requires field verification. " +
            "No grievances or community incidents confirmed at this stage.");
        risk.put("operational",
            "Potential equipment damage from pressure buildup. Pipeline downtime and maintenance " +
            "requirements to be assessed following field inspection.");
        risk.put("legalAndCompliance",
            "Regulatory reporting obligations apply if a confirmed release occurred. " +
            "Open CAPA and audit status reviewed separately. Legal liability determination " +
            "requires qualified legal and HSE review.");
        report.put("hseRiskAssessment", risk);

        // Root Cause Analysis
        Map<String, Object> rca = new LinkedHashMap<>();
        rca.put("disclaimer",
            "AI-generated hypothesis only. Does not constitute a confirmed root cause finding. " +
            "Human HSE investigation is required before any official determination.");
        rca.put("confirmedFacts", List.of(
            "Tank level exceeded critical threshold: " + level,
            "Valve was open at time of detection",
            "Event recorded by Sentinel at " + (event.getCreatedAt() != null
                ? event.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm:ss")) : "unknown") + " UTC"));
        rca.put("aiHypotheses", List.of(
            "Valve interlock may not have prevented filling beyond threshold",
            "Possible flow rate miscalculation during loading operation",
            "Potential sensor calibration drift if reading is inconsistent with manual gauge"));
        rca.put("requiresInvestigation", List.of(
            "Physical valve status confirmation",
            "Loading operation records review",
            "Sensor calibration records",
            "Operator activity log at time of incident",
            "Open audit findings review"));
        report.put("rootCauseAnalysis", rca);

        // CAPA Recommendations
        report.put("capaRecommendations", List.of(
            Map.of("action", "Physically verify valve closure and current tank level",
                   "reason", "Confirm automated shutdown was effective",
                   "responsibleRole", "Site Engineer / HSE Officer",
                   "priority", "CRITICAL",
                   "suggestedDeadlineDays", 1,
                   "verificationMethod", "Signed inspection record"),
            Map.of("action", "Inspect valve interlock functionality",
                   "reason", "Determine why valve was open when tank approached critical level",
                   "responsibleRole", "Engineering",
                   "priority", "CRITICAL",
                   "suggestedDeadlineDays", 2,
                   "verificationMethod", "Test result and maintenance log"),
            Map.of("action", "Conduct full site HSE inspection",
                   "reason", "Identify any additional risks at the facility",
                   "responsibleRole", "HSE Manager",
                   "priority", "HIGH",
                   "suggestedDeadlineDays", 3,
                   "verificationMethod", "Inspection report"),
            Map.of("action", "Review and close all open audit findings at this site",
                   "reason", "Open findings may be contributing factors",
                   "responsibleRole", "HSE Manager",
                   "priority", "HIGH",
                   "suggestedDeadlineDays", 14,
                   "verificationMethod", "Audit closure evidence"),
            Map.of("action", "Complete root cause investigation and file HSE investigation report",
                   "reason", "Required for corrective action and regulatory compliance",
                   "responsibleRole", "HSE Manager",
                   "priority", "HIGH",
                   "suggestedDeadlineDays", 7,
                   "verificationMethod", "Signed investigation report")));

        // Environmental
        report.put("environmentalImpactAssessment",
            "No confirmed environmental release at this stage. Sentinel's automated response " +
            "prevented potential overflow. Full environmental impact assessment requires field " +
            "verification by an environmental officer. Do not report environmental impact until confirmed.");

        // Community
        report.put("communityAndSocialImpact",
            "No confirmed community impact at this stage. Risk of community exposure exists if " +
            "any fuel release occurred before shutdown." +
            (highRisk ? " The Thange corridor communities remain at elevated risk from this asset class — " +
            "the 2015 spill affected 3,074 identified claimants." : "") +
            " Requires HSE verification and community liaison officer assessment.");

        // Management Insights
        List<String> insights = new ArrayList<>();
        insights.add("Overfill risk detected at " + site + " — site history should be reviewed for recurring valve or level anomalies.");
        if (highRisk) {
            insights.add("This site is on the Sentinel high-risk watch list. Repeated incidents here carry regulatory and legal exposure consistent with the Kimeu v. KPC judgment pattern.");
        }
        insights.add("Automated response time should be benchmarked against industry standard and against manual response time at comparable incidents.");
        insights.add("CAPA closure rate and overdue CAPAs indicate governance compliance status — review before regulatory audit.");
        report.put("managementInsights", insights);

        // Early Warning Signals
        report.put("earlyWarningSignals", List.of(
            "Repeated overfill detections at a single site signal a systemic control failure, not an isolated event",
            "Increasing CAPA overdue rate indicates follow-through gap in the corrective action process",
            "Inspection gaps at high-risk sites are a leading indicator of the Sinai/Thange incident class"));

        // ESG Connection
        Map<String, Object> esg = new LinkedHashMap<>();
        esg.put("environmental", List.of(
            "Spill prevention: automated closure prevented potential fuel release",
            "Environmental risk reduction: continuous monitoring at Thange-class site",
            "Pollution prevention: no confirmed release — incident contained within Sentinel response window"));
        esg.put("social", List.of(
            "Worker safety: automated response reduces human exposure to overfill emergency",
            "Community safety: incident at high-risk site managed without confirmed community impact",
            "Emergency response capability demonstrated: " + (Boolean.TRUE.equals(event.getActuationTriggered())
                ? "valve closed automatically" : "incident recorded and notified")));
        esg.put("governance", List.of(
            "Digital audit trail: full incident record from detection to response",
            "Incident governance: structured report generated for HSE professional review",
            "CAPA tracking: corrective actions recommended and tracked in system",
            "Compliance monitoring: open audit findings and overdue CAPAs surfaced for review"));
        report.put("esgConnection", esg);

        try {
            return objectMapper.writeValueAsString(report);
        } catch (Exception ex) {
            log.error("HseReportService: failed to serialize template report", ex);
            return "{}";
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractHeadline(String reportJson, EventEntity event) {
        try {
            var node = objectMapper.readTree(reportJson);
            var headline = node.path("executiveSummary").path("headline").asText(null);
            if (headline != null && !headline.isBlank()) return headline;
        } catch (Exception ex) {
            log.debug("HseReportService: could not extract headline from JSON");
        }
        return event.getSeverity() + " overfill condition — " + displayName(event.getSiteId());
    }

    private String extractHeadlineFromJson(String reportJson, com.sentinel.alert.AlertEntity alert) {
        try {
            var node = objectMapper.readTree(reportJson);
            var headline = node.path("executiveSummary").path("headline").asText(null);
            if (headline != null && !headline.isBlank()) return headline;
        } catch (Exception ex) {
            log.debug("HseReportService: could not extract headline from alert JSON");
        }
        return alert.getSeverity() + " alert — " + (alert.getTitle() != null ? alert.getTitle() : displayName(alert.getSiteId()));
    }

    private String assembleContextFromAlert(com.sentinel.alert.AlertEntity alert) {
        String siteId   = alert.getSiteId();
        String siteName = displayName(siteId);
        StringBuilder sb = new StringBuilder();

        sb.append("=== INCIDENT FACTS (from alert) ===\n");
        sb.append("Alert ID: ").append(alert.getId()).append("\n");
        sb.append("Site: ").append(siteName).append("\n");
        sb.append("Severity: ").append(alert.getSeverity()).append("\n");
        sb.append("Alert Rule: ").append(alert.getRule() != null ? alert.getRule() : "Unknown").append("\n");
        sb.append("Alert Title: ").append(alert.getTitle() != null ? alert.getTitle() : "Unknown").append("\n");
        sb.append("Detection Time: ").append(
            alert.getCreatedAt() != null
                ? alert.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss"))
                : "Unknown").append(" UTC\n");
        if (alert.getNarrative() != null && !alert.getNarrative().isBlank()) {
            sb.append("AI Narrative: ").append(alert.getNarrative()).append("\n");
        }
        if (alert.getDescription() != null && !alert.getDescription().isBlank()) {
            sb.append("Description: ").append(alert.getDescription()).append("\n");
        }

        sb.append("\n=== NOTE ===\n");
        sb.append("This report is generated from an alert record (no associated event record found).\n");
        sb.append("Some telemetry values (tank level, response time) are not available.\n");

        // CAPA status
        sb.append("\n=== CAPA STATUS ===\n");
        try {
            Long overdue = capaRepository.countOverdue(java.time.LocalDate.now());
            long created = capaRepository.countCreatedSince(java.time.LocalDateTime.now().minusDays(30));
            sb.append("CAPAs overdue: ").append(overdue != null ? overdue : 0).append("\n");
            sb.append("CAPAs created (30d): ").append(created).append("\n");
        } catch (Exception ex) { sb.append("CAPA data: unavailable\n"); }

        // High-risk context
        if (HIGH_RISK_SITES.contains(siteId)) {
            sb.append("\n=== HIGH-RISK SITE CONTEXT ===\n");
            if ("site-003".equals(siteId)) {
                sb.append("THANGE CORRIDOR: Kimeu & 3,074 others v. KPC ([2025] KEELC 5239), KES 3.02B.\n");
            }
            sb.append("SINAI REFERENCE: 2011 Nairobi Sinai fire (~100 lives) — undetected valve failure.\n");
        }

        sb.append("\n=== REPORT CONTEXT ===\n");
        sb.append("Generated: ").append(java.time.LocalDateTime.now().format(
            java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))).append(" UTC\n");
        sb.append("System: Sentinel AI HSE Agent — DRAFT for HSE professional review.\n");

        return sb.toString();
    }

    private String buildTemplateReportFromAlert(com.sentinel.alert.AlertEntity alert) {
        String site     = displayName(alert.getSiteId());
        String severity = alert.getSeverity() != null ? alert.getSeverity() : "High";
        String title    = alert.getTitle() != null ? alert.getTitle() : "Alert at " + site;
        boolean highRisk = HIGH_RISK_SITES.contains(alert.getSiteId());

        Map<String, Object> report = new LinkedHashMap<>();
        Map<String, Object> exec = new LinkedHashMap<>();
        exec.put("headline", severity + " alert: " + title);
        exec.put("whatHappened",
            "A " + severity + "-severity alert was triggered at " + site + ". " +
            "Rule: " + (alert.getRule() != null ? alert.getRule() : "threshold breach") + ". " +
            (alert.getNarrative() != null && !alert.getNarrative().isBlank()
                ? "Sentinel AI narrative: " + alert.getNarrative().substring(0, Math.min(300, alert.getNarrative().length()))
                : "HSE investigation required."));
        exec.put("severity", severity.toUpperCase());
        exec.put("immediateRisk", "Requires HSE investigation and field verification.");
        exec.put("environmentalImpactOccurred", false);
        exec.put("sentinelResponse", "Alert generated and HSE notification issued.");
        exec.put("currentStatus", "OPEN — pending investigation.");
        exec.put("keyActions", List.of(
            "Review alert details and dispatch field assessment team",
            "Verify site conditions physically",
            "Initiate CAPA if corrective action required",
            highRisk ? "PRIORITY: This is a high-risk watch site — escalate to HSE Manager immediately" : "Assign to responsible HSE officer"));
        report.put("executiveSummary", exec);

        Map<String, Object> narrative = new LinkedHashMap<>();
        narrative.put("whatSystemDetected", "Sentinel detected: " + title);
        narrative.put("whyConditionWasAbnormal", "Alert rule triggered: " + (alert.getRule() != null ? alert.getRule() : "threshold exceeded"));
        narrative.put("whatRiskItCreated", severity + "-severity risk at " + site + ". Physical verification required.");
        narrative.put("whatSentinelDid", "Recorded alert and generated HSE notification for review.");
        narrative.put("whatHappenedAfterIntervention", "Pending field verification and HSE investigation.");
        report.put("narrative", narrative);

        Map<String, Object> risk = new LinkedHashMap<>();
        risk.put("overallRisk", severity.toUpperCase());
        risk.put("healthSafety", "Worker safety risk at " + site + " pending field verification.");
        risk.put("environmental", "No confirmed environmental release. Requires field verification." +
            (highRisk ? " Thange corridor proximity elevates environmental risk." : ""));
        risk.put("community", "No confirmed community impact. " + (highRisk ? "High-risk site — Thange precedent applies." : "Field verification required."));
        risk.put("legalAndCompliance", highRisk ? "Site-003 carries Kimeu v. KPC precedent (KES 3.02B). Any confirmed release at this site requires immediate legal team notification." : "Regulatory obligations apply if confirmed release.");
        report.put("riskAssessment", risk);

        report.put("rootCauseAnalysis", Map.of(
            "disclaimer", "AI-generated hypothesis only. Requires HSE investigation.",
            "confirmedFacts", List.of("Alert triggered at " + site, "Severity: " + severity, "Rule: " + (alert.getRule() != null ? alert.getRule() : "unknown")),
            "aiHypotheses", List.of("Threshold breach due to operational or equipment anomaly", "May indicate recurring issue at this site"),
            "requiresInvestigation", List.of("Physical site inspection", "Equipment status check", "Operator activity log review")));

        report.put("capaRecommendations", List.of(
            Map.of("action", "Conduct field inspection at " + site, "priority", severity.toUpperCase(), "responsibleRole", "Site Engineer / HSE Officer", "suggestedDeadlineDays", 1, "verificationMethod", "Signed inspection record"),
            Map.of("action", "Review and close all open audit findings", "priority", "HIGH", "responsibleRole", "HSE Manager", "suggestedDeadlineDays", 14, "verificationMethod", "Audit closure evidence")));

        report.put("environmentalImpactAssessment", "No confirmed release. Field verification required.");
        report.put("managementInsights", List.of(
            "Alert at " + site + " requires immediate investigation.",
            highRisk ? "This is a high-risk watch site — Kimeu v. KPC precedent (KES 3.02B) applies to any confirmed incident here." : "Ensure CAPA closure rates remain current."));
        report.put("earlyWarningSignals", List.of("Repeated alerts at same site signal systemic risk", "Open CAPAs combined with new alerts indicate governance gap"));
        report.put("esgConnection", Map.of(
            "environmental", List.of("Incident monitored — no confirmed release"),
            "social", List.of("Worker safety risk under investigation"),
            "governance", List.of("Alert documented with full audit trail", "CAPA tracking active")));
        report.put("reportingConfidence", Map.of(
            "highConfidence", "Alert record — directly from Sentinel",
            "mediumConfidence", "Risk assessment derived from alert severity and site classification",
            "requiresVerification", "Root cause, environmental impact, community impact, physical site conditions"));

        try {
            return objectMapper.writeValueAsString(report);
        } catch (Exception ex) {
            log.error("HseReportService: failed to serialize alert template report", ex);
            return "{}";
        }
    }

    private String displayName(String siteId) {
        return SITE_DISPLAY_NAMES.getOrDefault(siteId,
            siteId != null ? siteId.toUpperCase() : "Unknown Site");
    }
}
