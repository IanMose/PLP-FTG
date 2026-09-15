package com.sentinel.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinel.actuation.ActuationService;
import com.sentinel.alert.AlertRepository;
import com.sentinel.capa.CapaRepository;
import com.sentinel.event.EventService;
import com.sentinel.quality.QualityService;
import com.sentinel.site.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AiChatController — Sentinel AI Assistant.
 *
 * Handles two types of requests:
 *
 *   1. Regular questions  → returns { "type": "answer", "answer": "..." }
 *   2. Report requests    → returns { "type": "report", "reportType": "...", "report": { ... } }
 *
 * Report types supported:
 *   - esg_summary        : ESG metrics summary across E, S, G pillars
 *   - site_risk          : Risk breakdown by site (high-risk focus)
 *   - capa_status        : Open, overdue, closed CAPA breakdown
 *   - hse_full           : Full HSE summary (incidents, automation, KPIs, insights)
 *
 * POST /api/ai/chat
 * Body:  { "question": "..." }
 * Returns: { "type": "answer"|"report", "answer"?: "...", "reportType"?: "...", "report"?: { ... } }
 */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AiChatController {

    private final EventService       eventService;
    private final ActuationService   actuationService;
    private final AlertRepository    alertRepository;
    private final CapaRepository     capaRepository;
    private final IncidentRepository incidentRepository;
    private final QualityService     qualityService;
    private final ObjectMapper       objectMapper;

    @Value("${sentinel.llm.groq-api-key:}")
    private String groqApiKey;

    @Value("${sentinel.llm.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${sentinel.llm.enabled:true}")
    private boolean llmEnabled;

    private static final String GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
    private static final int    TIMEOUT_MS = 10_000;
    private static final int    MAX_TOKENS_ANSWER = 600;
    private static final int    MAX_TOKENS_REPORT = 1200;

    // ── System prompt for conversational answers ──────────────────────────────

    private static final String ANSWER_SYSTEM_PROMPT = """
        You are Sentinel AI — an intelligent assistant for the Sentinel pipeline safety and ESG \
        monitoring system built for Kenya Pipeline Company (KPC).

        You have access to live operational data provided in the context below. Use it to answer \
        the user's question accurately and concisely.

        Your role:
        - Answer questions about pipeline incidents, alerts, CAPAs, ESG metrics, and site safety
        - Explain what the data means in plain language
        - Know these two incidents in detail:
          SINAI 2011: A valve failure at a KPC storage tank caused fuel to leak into a Nairobi sewer. \
          It went undetected, ignited, and killed approximately 100 people in the Sinai settlement. \
          The failure was physical — the opportunity for prevention was digital.
          THANGE 2015: A fuel spill at the Makueni Pipeline Section along the Thange River corridor. \
          Also an undetected valve/tank failure. A decade of legal proceedings followed. \
          In 2025 the Kenya Environment and Land Court ruled in Kimeu & 3,074 others v. KPC \
          ([2025] KEELC 5239) — gross award KES 3.02 billion. Site-003 in Sentinel is this site.
        - Both incidents share one root cause: no system was continuously watching tank level, \
          flow rate, and valve status. Sentinel exists to close that gap.

        Rules:
        - Only use the data provided. Do not invent numbers.
        - If data is unavailable, say so clearly.
        - Keep answers concise — 3-5 sentences unless the question requires more.
        - Never claim legal liability or confirmed root causes.
        - Always distinguish between confirmed facts and analysis.
        """;

    // ── System prompt for structured report generation ────────────────────────

    private static final String REPORT_SYSTEM_PROMPT = """
        You are the Sentinel AI HSE & ESG Reporting Agent for Kenya Pipeline Company (KPC).

        You generate structured, professional reports from pipeline safety operational data.

        The context below contains live Sentinel system data. Use ONLY this data. Do not invent numbers.

        Generate a valid JSON object matching exactly the structure requested. \
        Return ONLY the JSON — no markdown, no explanation outside the JSON.

        Professional standards:
        - Distinguish confirmed facts from AI analysis everywhere
        - Label all root cause hypotheses as "AI hypothesis — requires HSE investigation"
        - Never confirm environmental damage, injuries, or legal liability unless stated in the data
        - Use professional HSE/ESG language
        - Reference Sinai 2011 and Thange/Kimeu context where relevant to risk framing
        - If a value is unavailable, use null or "Requires verification"
        """;

    // ── Chat endpoint ─────────────────────────────────────────────────────────

    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody ChatRequest request) {
        if (request.question() == null || request.question().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("type", "answer", "answer", "Please ask a question."));
        }

        String q = request.question().trim();
        log.info("AiChatController: question='{}...'", q.substring(0, Math.min(80, q.length())));

        // Detect report intent
        ReportType reportType = detectReportIntent(q);

        if (reportType != null) {
            log.info("AiChatController: report intent detected — {}", reportType);
            Map<String, Object> report = generateReport(reportType);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("type", "report");
            response.put("reportType", reportType.key);
            response.put("reportTitle", reportType.title);
            response.put("report", report);
            return ResponseEntity.ok(response);
        }

        // Regular conversational answer
        String context = assembleContext();
        String answer  = askGroq(q, context, ANSWER_SYSTEM_PROMPT, MAX_TOKENS_ANSWER);
        return ResponseEntity.ok(Map.of("type", "answer", "answer", answer));
    }

    // ── Report intent detection ───────────────────────────────────────────────

    enum ReportType {
        ESG_SUMMARY    ("esg_summary",  "ESG Summary Report"),
        SITE_RISK      ("site_risk",    "Site Risk Report"),
        CAPA_STATUS    ("capa_status",  "CAPA Status Report"),
        HSE_FULL       ("hse_full",     "Full HSE Report");

        final String key;
        final String title;
        ReportType(String key, String title) { this.key = key; this.title = title; }
    }

    private ReportType detectReportIntent(String q) {
        String lower = q.toLowerCase();

        // Must contain a report/generate/summary trigger word
        boolean hasReportTrigger = lower.contains("report") || lower.contains("generate")
            || lower.contains("summary") || lower.contains("give me") || lower.contains("show me")
            || lower.contains("create") || lower.contains("produce") || lower.contains("full");

        if (!hasReportTrigger) return null;

        if (lower.contains("esg") || lower.contains("sustainability") || lower.contains("environmental, social")) {
            return ReportType.ESG_SUMMARY;
        }
        if (lower.contains("site risk") || lower.contains("risk report") || lower.contains("site summary")
                || lower.contains("which site") || lower.contains("site status")) {
            return ReportType.SITE_RISK;
        }
        if (lower.contains("capa") || lower.contains("corrective") || lower.contains("overdue action")) {
            return ReportType.CAPA_STATUS;
        }
        if (lower.contains("hse") || lower.contains("full report") || lower.contains("incident report")
                || lower.contains("full hse") || lower.contains("safety report")) {
            return ReportType.HSE_FULL;
        }
        // Generic "generate a report" — default to HSE full
        if (lower.contains("report")) {
            return ReportType.HSE_FULL;
        }
        return null;
    }

    // ── Report generation ─────────────────────────────────────────────────────

    private Map<String, Object> generateReport(ReportType type) {
        String context = assembleContext();
        String period  = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")) + " UTC";

        String prompt = switch (type) {
            case ESG_SUMMARY -> buildEsgReportPrompt(context, period);
            case SITE_RISK   -> buildSiteRiskPrompt(context, period);
            case CAPA_STATUS -> buildCapaStatusPrompt(context, period);
            case HSE_FULL    -> buildHseFullPrompt(context, period);
        };

        // Try LLM first
        if (llmEnabled && groqApiKey != null && !groqApiKey.isBlank()) {
            try {
                String json = askGroqRaw(prompt, REPORT_SYSTEM_PROMPT, MAX_TOKENS_REPORT);
                if (json != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> parsed = objectMapper.readValue(json, Map.class);
                    parsed.put("_generatedBy", "Sentinel AI (Groq LLM)");
                    parsed.put("_generatedAt", period);
                    parsed.put("_disclaimer", "AI-generated report. Requires HSE professional review before external use.");
                    return parsed;
                }
            } catch (Exception ex) {
                log.warn("AiChatController: LLM report generation failed, using template: {}", ex.getMessage());
            }
        }

        // Template fallback — always works
        return buildTemplateReport(type, context, period);
    }

    // ── Report prompts ────────────────────────────────────────────────────────

    private String buildEsgReportPrompt(String context, String period) {
        return """
            LIVE DATA:
            """ + context + """

            Generate an ESG Summary Report as JSON with this exact structure:
            {
              "period": "reporting period",
              "headline": "one-sentence ESG summary",
              "environmental": {
                "headline": "E pillar summary sentence",
                "metrics": [
                  { "metric": "name", "value": "value", "source": "Sentinel/Calculated", "status": "VERIFIED|ESTIMATED" }
                ],
                "keyFinding": "most important E finding"
              },
              "social": {
                "headline": "S pillar summary sentence",
                "metrics": [
                  { "metric": "name", "value": "value", "source": "source", "status": "status" }
                ],
                "keyFinding": "most important S finding",
                "sinaiThangeContext": "brief reference to how this relates to Sinai/Thange prevention"
              },
              "governance": {
                "headline": "G pillar summary sentence",
                "metrics": [
                  { "metric": "name", "value": "value", "source": "source", "status": "status" }
                ],
                "keyFinding": "most important G finding"
              },
              "managementInsights": ["insight 1", "insight 2"],
              "reportingConfidence": "brief confidence note"
            }
            Return ONLY valid JSON.
            """;
    }

    private String buildSiteRiskPrompt(String context, String period) {
        return """
            LIVE DATA:
            """ + context + """

            Generate a Site Risk Report as JSON:
            {
              "period": "reporting period",
              "headline": "overall site risk summary",
              "highRiskSites": [
                {
                  "siteId": "site-003",
                  "siteName": "Makueni Pipeline Section (Thange Corridor)",
                  "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW",
                  "incidentsLast30d": 0,
                  "keyRisk": "one sentence",
                  "thangeContext": "brief Kimeu v. KPC reference if applicable",
                  "recommendedAction": "immediate action"
                }
              ],
              "allSites": [
                { "siteId": "...", "siteName": "...", "riskLevel": "...", "incidentsLast30d": 0, "status": "..." }
              ],
              "systemCoverage": {
                "sitesMonitored": 7,
                "pipelineKm": 450,
                "continuousMonitoring": true
              },
              "managementInsights": ["insight 1", "insight 2"],
              "disclaimer": "AI risk assessment — requires HSE field verification"
            }
            Return ONLY valid JSON.
            """;
    }

    private String buildCapaStatusPrompt(String context, String period) {
        return """
            LIVE DATA:
            """ + context + """

            Generate a CAPA Status Report as JSON:
            {
              "period": "reporting period",
              "headline": "one-sentence CAPA status summary",
              "summary": {
                "created30d": 0,
                "closedTotal": 0,
                "overdue": 0,
                "avgClosureDays": null,
                "onTimeRate": null
              },
              "statusBreakdown": {
                "open": "number or N/A",
                "inProgress": "number or N/A",
                "closed": "number or N/A",
                "overdue": "number or N/A"
              },
              "governanceInsights": ["insight about CAPA governance"],
              "recommendations": [
                { "action": "...", "priority": "HIGH|MEDIUM", "reason": "..." }
              ],
              "disclaimer": "AI-generated. Requires HSE manager review."
            }
            Return ONLY valid JSON.
            """;
    }

    private String buildHseFullPrompt(String context, String period) {
        return """
            LIVE DATA:
            """ + context + """

            Generate a Full HSE Summary Report as JSON:
            {
              "period": "reporting period",
              "headline": "one sentence — overall HSE status",
              "executiveSummary": "2-3 sentences for a senior executive",
              "incidentOverview": {
                "totalEvents30d": 0,
                "overfillEvents30d": 0,
                "criticalEvents": 0,
                "highRiskSiteEvents": 0,
                "status": "REQUIRES_ATTENTION|STABLE|IMPROVING"
              },
              "automationPerformance": {
                "valveClosures30d": 0,
                "avgResponseTimeSec": null,
                "successRate": null,
                "litresSaved": 0,
                "interpretation": "what this means in plain language"
              },
              "hseKpis": [
                { "kpi": "name", "value": "value", "period": "30d", "trend": "UP|DOWN|STABLE|INSUFFICIENT_DATA" }
              ],
              "riskAssessment": {
                "overallRisk": "CRITICAL|HIGH|MEDIUM|LOW",
                "healthSafety": "assessment",
                "environmental": "assessment — if no confirmed release, say so explicitly",
                "community": "assessment",
                "topRisks": ["risk 1", "risk 2"]
              },
              "capaStatus": {
                "overdue": 0,
                "created30d": 0,
                "avgClosureDays": null,
                "governanceNote": "..."
              },
              "esgRelevance": {
                "environmental": ["E metric or finding"],
                "social": ["S metric or finding"],
                "governance": ["G metric or finding"]
              },
              "managementInsights": ["insight 1 — data pattern", "insight 2"],
              "earlyWarningSignals": ["signal 1"],
              "reportingConfidence": {
                "highConfidence": "directly from Sentinel telemetry",
                "mediumConfidence": "calculated from available data",
                "requiresVerification": "root cause, environmental impact, community impact"
              },
              "disclaimer": "AI-generated HSE report. Requires HSE professional review. Not a confirmed investigation finding."
            }
            Return ONLY valid JSON.
            """;
    }

    // ── Template fallback reports ─────────────────────────────────────────────

    private Map<String, Object> buildTemplateReport(ReportType type, String context, String period) {
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("period", period);
        report.put("_generatedBy", "Sentinel AI (template — no LLM key configured)");
        report.put("_generatedAt", period);
        report.put("_disclaimer", "AI-generated report. Requires HSE professional review before external use.");

        switch (type) {
            case ESG_SUMMARY -> {
                long closures = safeCountClosures(since30d);
                long litres   = safeLitresSaved(since30d);
                long overdue  = safeCapaOverdue();
                report.put("headline", "Sentinel is actively monitoring 7 KPC pipeline sites — ESG metrics derived from live operational data.");
                report.put("environmental", Map.of(
                    "headline", "Continuous spill prevention monitoring across 7 sites and 450km of pipeline corridor.",
                    "metrics", List.of(
                        Map.of("metric", "Automated valve closures (30d)", "value", closures, "source", "Sentinel", "status", "VERIFIED"),
                        Map.of("metric", "Estimated litres saved (30d)", "value", litres + "L", "source", "Calculated", "status", "ESTIMATED"),
                        Map.of("metric", "Sites monitored", "value", 7, "source", "Sentinel", "status", "VERIFIED"),
                        Map.of("metric", "Pipeline corridor", "value", "450 km", "source", "Sentinel", "status", "VERIFIED")
                    ),
                    "keyFinding", "No confirmed environmental release this period. Automated response prevented potential overflow events."
                ));
                report.put("social", Map.of(
                    "headline", "7 KPC pipeline sites protected, including 2 high-risk sites with direct community exposure.",
                    "metrics", List.of(
                        Map.of("metric", "High-risk sites monitored", "value", 2, "source", "Sentinel", "status", "VERIFIED"),
                        Map.of("metric", "Communities in monitoring zone", "value", 7, "source", "Sentinel", "status", "ESTIMATED"),
                        Map.of("metric", "Thange corridor watch active", "value", "YES — site-003", "source", "Sentinel", "status", "VERIFIED")
                    ),
                    "keyFinding", "Makueni (Thange) and Sinendet remain on the high-risk watch list. No confirmed community impact this period.",
                    "sinaiThangeContext", "The 2011 Sinai fire (~100 lives) and 2015 Thange spill (Kimeu v. KPC, KES 3.02B) both began as undetected valve failures. Sentinel's continuous monitoring directly addresses this failure class."
                ));
                report.put("governance", Map.of(
                    "headline", "Corrective action tracking and data quality governance active.",
                    "metrics", List.of(
                        Map.of("metric", "CAPAs overdue", "value", overdue, "source", "Sentinel", "status", "VERIFIED"),
                        Map.of("metric", "Data quality gate", "value", safeDataQualityGate(), "source", "Sentinel", "status", "VERIFIED"),
                        Map.of("metric", "Digital audit trail", "value", "Full — every event recorded", "source", "Sentinel", "status", "VERIFIED")
                    ),
                    "keyFinding", overdue > 0
                        ? overdue + " CAPAs are overdue — governance follow-through gap requires management attention."
                        : "CAPA governance on track. No overdue corrective actions."
                ));
                report.put("managementInsights", List.of(
                    "Sentinel is operational and detecting events continuously — data is being generated and stored.",
                    "The Thange corridor site (site-003) remains on the high-risk watch list — any incident here carries KES 3.02B liability precedent.",
                    "ESG metrics are system-generated and require human verification before inclusion in external sustainability reports."
                ));
                report.put("reportingConfidence", "High: telemetry counts and valve actuation records. Medium: litres/KES estimates. Requires verification: environmental impact, community impact.");
            }
            case SITE_RISK -> {
                long mk30 = safeIncidentsBySite("site-003", since30d);
                long sn30 = safeIncidentsBySite("site-006", since30d);
                report.put("headline", "7 KPC pipeline sites under continuous Sentinel monitoring. 2 sites on high-risk watch list.");
                report.put("highRiskSites", List.of(
                    Map.of(
                        "siteId", "site-003",
                        "siteName", "Makueni Pipeline Section (Thange Corridor)",
                        "riskLevel", mk30 > 5 ? "CRITICAL" : mk30 > 0 ? "HIGH" : "HIGH",
                        "incidentsLast30d", mk30,
                        "keyRisk", "High-risk site — location of the 2015 Thange spill. Any valve or tank failure here carries direct community and environmental exposure.",
                        "thangeContext", "Kimeu & 3,074 others v. KPC ([2025] KEELC 5239) — KES 3.02 billion gross award. This is that site.",
                        "recommendedAction", "Ensure all inspection schedules are current and no audit findings are open at this site."
                    ),
                    Map.of(
                        "siteId", "site-006",
                        "siteName", "Sinendet Pump Station",
                        "riskLevel", sn30 > 5 ? "CRITICAL" : "HIGH",
                        "incidentsLast30d", sn30,
                        "keyRisk", "High-risk pump station on the Sentinel watch list. Pump station failures can escalate faster than terminal tank failures.",
                        "thangeContext", "N/A",
                        "recommendedAction", "Review pump station inspection records and ensure CAPA follow-through."
                    )
                ));
                report.put("allSites", List.of(
                    Map.of("siteId", "site-001", "siteName", "Nairobi Terminal (Embakasi)", "riskLevel", "MEDIUM", "incidentsLast30d", safeIncidentsBySite("site-001", since30d), "status", "Monitored"),
                    Map.of("siteId", "site-002", "siteName", "Mombasa Terminal (Kipevu)", "riskLevel", "MEDIUM", "incidentsLast30d", safeIncidentsBySite("site-002", since30d), "status", "Monitored"),
                    Map.of("siteId", "site-003", "siteName", "Makueni Pipeline Section", "riskLevel", "HIGH", "incidentsLast30d", mk30, "status", "HIGH-RISK WATCH"),
                    Map.of("siteId", "site-004", "siteName", "Nakuru Depot", "riskLevel", "LOW", "incidentsLast30d", safeIncidentsBySite("site-004", since30d), "status", "Monitored"),
                    Map.of("siteId", "site-005", "siteName", "Eldoret Terminal", "riskLevel", "LOW", "incidentsLast30d", safeIncidentsBySite("site-005", since30d), "status", "Monitored"),
                    Map.of("siteId", "site-006", "siteName", "Sinendet Pump Station", "riskLevel", "HIGH", "incidentsLast30d", sn30, "status", "HIGH-RISK WATCH"),
                    Map.of("siteId", "site-007", "siteName", "Kisumu Terminal", "riskLevel", "LOW", "incidentsLast30d", safeIncidentsBySite("site-007", since30d), "status", "Monitored")
                ));
                report.put("systemCoverage", Map.of("sitesMonitored", 7, "pipelineKm", 450, "continuousMonitoring", true));
                report.put("managementInsights", List.of(
                    "The two high-risk sites (Makueni/Thange and Sinendet) require priority attention — repeat incidents at these sites carry the highest regulatory and liability exposure.",
                    "Continuous monitoring means Sentinel detects threshold breaches seconds after they occur — the failure pattern that went undetected in 2011 (Sinai) and 2015 (Thange) is now visible in real time."
                ));
                report.put("disclaimer", "AI risk assessment based on incident count and site classification. Requires HSE field verification for confirmed risk rating.");
            }
            case CAPA_STATUS -> {
                long created30d = safeCapaCreated(since30d);
                long closed     = safeCapaClosed();
                long overdue    = safeCapaOverdue();
                Double avgDays  = safeAvgCapaDays();
                report.put("headline", buildCapaHeadline(overdue, created30d));
                report.put("summary", Map.of(
                    "created30d", created30d,
                    "closedTotal", closed,
                    "overdue", overdue,
                    "avgClosureDays", avgDays != null ? String.format("%.1f days", avgDays) : "No closures recorded",
                    "onTimeRate", "Requires calculation"
                ));
                report.put("statusBreakdown", Map.of(
                    "created30d", created30d,
                    "closed", closed,
                    "overdue", overdue,
                    "open", "Requires HSE system query"
                ));
                report.put("governanceInsights", buildCapaInsights(overdue, created30d, closed, avgDays));
                report.put("recommendations", overdue > 0
                    ? List.of(
                        Map.of("action", "Review and close " + overdue + " overdue CAPA(s) immediately", "priority", "HIGH", "reason", "Overdue CAPAs represent unresolved corrective actions and a governance gap that auditors will flag."),
                        Map.of("action", "Assign responsible owners to all open CAPAs", "priority", "HIGH", "reason", "Unowned CAPAs never close.")
                      )
                    : List.of(
                        Map.of("action", "Continue current CAPA closure pace", "priority", "LOW", "reason", "No overdue CAPAs detected. Maintain governance discipline.")
                      )
                );
                report.put("disclaimer", "AI-generated CAPA summary from Sentinel data. Requires HSE manager review for accuracy.");
            }
            case HSE_FULL -> {
                long events30d = safeEventCount(since30d);
                long overfills = safeOverfillCount(since30d);
                long closures  = safeCountClosures(since30d);
                Double avgMs   = safeAvgLatency(since30d);
                long litres    = safeLitresSaved(since30d);
                long overdue   = safeCapaOverdue();

                report.put("headline", "Sentinel HSE Summary — 7 KPC sites monitored. " +
                    events30d + " events detected in last 30 days. " +
                    closures + " automated valve closures.");
                report.put("executiveSummary",
                    "Sentinel has continuously monitored " + 7 + " Kenya Pipeline Company sites over the last 30 days, " +
                    "detecting " + events30d + " pipeline events including " + overfills + " overfill conditions. " +
                    "The automated control plane executed " + closures + " valve closures" +
                    (avgMs != null ? " with an average response time of " + String.format("%.2f", avgMs / 1000.0) + " seconds" : "") + ". " +
                    "No confirmed environmental release this period. All events are recorded with full audit trail."
                );
                report.put("incidentOverview", Map.of(
                    "totalEvents30d", events30d,
                    "overfillEvents30d", overfills,
                    "criticalEvents", "Requires severity breakdown query",
                    "highRiskSiteEvents", safeIncidentsBySite("site-003", since30d) + safeIncidentsBySite("site-006", since30d),
                    "status", events30d > 10 ? "REQUIRES_ATTENTION" : "MONITORING"
                ));
                report.put("automationPerformance", Map.of(
                    "valveClosures30d", closures,
                    "avgResponseTimeSec", avgMs != null ? String.format("%.2fs", avgMs / 1000.0) : "N/A",
                    "successRate", safeSuccessRate(since30d),
                    "litresSaved", litres + "L",
                    "interpretation", closures > 0
                        ? "Sentinel automated the safety response to " + closures + " overfill events — each closure prevented a potential fuel release without requiring manual intervention."
                        : "Automated response system is operational and ready. No activations this period."
                ));
                report.put("hseKpis", List.of(
                    Map.of("kpi", "Overfill events detected", "value", events30d, "period", "30d", "trend", "INSUFFICIENT_DATA"),
                    Map.of("kpi", "Automated valve closures", "value", closures, "period", "30d", "trend", "INSUFFICIENT_DATA"),
                    Map.of("kpi", "CAPAs overdue", "value", overdue, "period", "current", "trend", overdue > 0 ? "REQUIRES_ATTENTION" : "STABLE"),
                    Map.of("kpi", "Data quality gate", "value", safeDataQualityGate(), "period", "current", "trend", "STABLE")
                ));
                report.put("riskAssessment", Map.of(
                    "overallRisk", overdue > 3 || events30d > 20 ? "HIGH" : "MEDIUM",
                    "healthSafety", "Worker safety risk exists at sites with active overfill events. Automated shutdown reduces direct worker exposure to overflow emergencies.",
                    "environmental", "No confirmed environmental release this reporting period. Sentinel's automated response prevented potential fuel overflow at detected events. Environmental impact assessment requires field verification.",
                    "community", "No confirmed community impact this period. Makueni (Thange corridor) and Sinendet remain on high-risk watch — community exposure risk is elevated at these sites by historical precedent.",
                    "topRisks", List.of(
                        "Overdue CAPAs represent unresolved corrective actions — potential repeat incidents",
                        "Thange corridor site (site-003) carries KES 3.02B liability precedent — any undetected failure here is a governance failure"
                    )
                ));
                report.put("capaStatus", Map.of(
                    "overdue", overdue,
                    "created30d", safeCapaCreated(since30d),
                    "avgClosureDays", safeAvgCapaDays() != null ? String.format("%.1f days", safeAvgCapaDays()) : "No closures recorded",
                    "governanceNote", overdue > 0 ? overdue + " overdue CAPAs require immediate management attention." : "No overdue CAPAs. Governance discipline maintained."
                ));
                report.put("esgRelevance", Map.of(
                    "environmental", List.of("Spill prevention: " + closures + " automated valve closures prevented potential releases", "Continuous monitoring: 7 sites, 450km pipeline corridor", "No confirmed environmental release this period"),
                    "social", List.of("Worker safety: automated response reduces human exposure to overflow emergencies", "Community protection: continuous monitoring at Thange corridor and Sinendet", "2 high-risk communities in monitoring zone"),
                    "governance", List.of("Digital audit trail: every event recorded from detection to response", "CAPA tracking: corrective actions managed in system", "Data quality gate: " + safeDataQualityGate())
                ));
                report.put("managementInsights", List.of(
                    "The data shows Sentinel is actively detecting and responding to pipeline events — " + events30d + " events in 30 days with " + closures + " automated closures.",
                    "The Thange corridor site carries the highest liability profile in the network. Repeated or unresolved incidents here should trigger immediate escalation.",
                    overdue > 0 ? "CAPA governance gap detected: " + overdue + " overdue corrective actions. This is a leading indicator of repeat incidents." : "CAPA governance is current. Continue monitoring closure rates.",
                    "Sentinel's sub-second response time compared to the hours-long manual response in both Sinai 2011 and Thange 2015 is the core differentiator."
                ));
                report.put("earlyWarningSignals", List.of(
                    "Repeated overfill events at a single site signal systemic control failure — monitor for site-specific clustering",
                    "Increasing CAPA overdue rate is a leading indicator of repeat incidents and governance breakdown",
                    "Inspection gaps at high-risk sites (Thange/Sinendet) are the same leading failure pattern as Sinai 2011 and Thange 2015"
                ));
                report.put("reportingConfidence", Map.of(
                    "highConfidence", "Event counts, valve actuation records, timestamps — directly from Sentinel telemetry",
                    "mediumConfidence", "Litres/KES estimates, risk ratings derived from incident counts",
                    "requiresVerification", "Root cause determination, environmental impact, community impact, injury/fatality status, legal exposure"
                ));
                report.put("disclaimer", "AI-generated HSE report. Requires HSE professional review before external use. Does not constitute a confirmed investigation finding.");
            }
        }

        return report;
    }

    // ── Groq calls ────────────────────────────────────────────────────────────

    private String askGroq(String question, String context, String systemPrompt, int maxTokens) {
        if (!llmEnabled || groqApiKey == null || groqApiKey.isBlank()) {
            return buildFallbackAnswer(question, context);
        }
        try {
            String userMessage = "LIVE SYSTEM DATA:\n" + context + "\n\nQUESTION: " + question;
            String raw = callGroqRaw(systemPrompt, userMessage, maxTokens, 0.3, false);
            return raw != null ? raw : buildFallbackAnswer(question, context);
        } catch (Exception ex) {
            log.warn("AiChatController: Groq answer failed: {}", ex.getMessage());
            return buildFallbackAnswer(question, context);
        }
    }

    private String askGroqRaw(String userPrompt, String systemPrompt, int maxTokens) {
        return callGroqRaw(systemPrompt, userPrompt, maxTokens, 0.2, true);
    }

    private String callGroqRaw(String systemPrompt, String userMessage, int maxTokens, double temperature, boolean jsonMode) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        RestTemplate restTemplate = new RestTemplate(factory);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", groqModel);
        body.put("messages", List.of(
            Map.of("role", "system", "content", systemPrompt),
            Map.of("role", "user",   "content", userMessage)
        ));
        body.put("max_tokens", maxTokens);
        body.put("temperature", temperature);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                GROQ_URL, new HttpEntity<>(body, headers), Map.class);

            if (response == null) return null;
            @SuppressWarnings("unchecked")
            var choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            var message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) return null;
            String content = (String) message.get("content");
            return (content != null && !content.isBlank()) ? content.trim() : null;
        } catch (Exception ex) {
            log.warn("AiChatController: Groq call failed: {}", ex.getMessage());
            return null;
        }
    }

    // ── Context assembly ──────────────────────────────────────────────────────

    private String assembleContext() {
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);
        StringBuilder sb = new StringBuilder();

        sb.append("=== SENTINEL LIVE SYSTEM STATUS ===\n");
        sb.append("Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))).append(" UTC\n\n");

        try {
            long events30d = eventService.countTotalEvents(since30d);
            long overfills = eventService.countOverfillEvents(since30d);
            var  recent    = eventService.getRecentEvents(5);
            sb.append("RECENT EVENTS (last 30 days):\n");
            sb.append("- Total events: ").append(events30d).append("\n");
            sb.append("- Overfill events: ").append(overfills).append("\n");
            if (!recent.isEmpty()) {
                sb.append("- Most recent:\n");
                recent.forEach(e -> sb.append("  * ").append(e.getSeverity())
                    .append(" | ").append(e.getSiteId())
                    .append(" | Tank ").append(e.getTankId())
                    .append(" | ").append(e.getSignalValue() != null ? e.getSignalValue().toPlainString() + "%" : "")
                    .append(" | ").append(e.getCreatedAt() != null ? e.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM HH:mm")) : "")
                    .append("\n"));
            }
        } catch (Exception ex) { sb.append("EVENTS: Could not retrieve\n"); }

        try {
            long closures  = actuationService.countSuccessfulClosures(since30d);
            Double avgMs   = actuationService.getAverageLatency(since30d);
            Double rate    = actuationService.getSuccessRate(since30d);
            long litres    = actuationService.calculateLitresSaved(since30d);
            sb.append("\nAUTOMATION (last 30 days):\n");
            sb.append("- Successful valve closures: ").append(closures).append("\n");
            sb.append("- Avg response time: ").append(avgMs != null ? String.format("%.1fs", avgMs / 1000.0) : "N/A").append("\n");
            sb.append("- Success rate: ").append(rate != null ? String.format("%.1f%%", rate) : "N/A").append("\n");
            sb.append("- Estimated litres saved: ").append(litres).append("L\n");
        } catch (Exception ex) { sb.append("AUTOMATION: Could not retrieve\n"); }

        try {
            long active = alertRepository.findByStatusOrderByCreatedAtDesc("active").size();
            long acked  = alertRepository.findByStatusOrderByCreatedAtDesc("acknowledged").size();
            sb.append("\nALERTS:\n");
            sb.append("- Active (unacknowledged): ").append(active).append("\n");
            sb.append("- Acknowledged: ").append(acked).append("\n");
        } catch (Exception ex) { sb.append("ALERTS: Could not retrieve\n"); }

        try {
            Long closed     = capaRepository.countClosed();
            Long overdue    = capaRepository.countOverdue(LocalDate.now());
            long created30d = capaRepository.countCreatedSince(since30d);
            Double avgDays  = capaRepository.avgClosureDays();
            sb.append("\nCAPAs:\n");
            sb.append("- Created last 30 days: ").append(created30d).append("\n");
            sb.append("- Closed (total): ").append(closed != null ? closed : 0).append("\n");
            sb.append("- Overdue: ").append(overdue != null ? overdue : 0).append("\n");
            sb.append("- Avg closure time: ").append(avgDays != null ? String.format("%.1f days", avgDays) : "No closures yet").append("\n");
        } catch (Exception ex) { sb.append("CAPAs: Could not retrieve\n"); }

        try {
            long total   = incidentRepository.countAll();
            long mk30    = incidentRepository.countBySiteIdAndIncidentDateAfter("site-003", since30d);
            long sn30    = incidentRepository.countBySiteIdAndIncidentDateAfter("site-006", since30d);
            sb.append("\nINCIDENTS:\n");
            sb.append("- Total recorded: ").append(total).append("\n");
            sb.append("- Makueni (Thange) last 30d: ").append(mk30).append("\n");
            sb.append("- Sinendet last 30d: ").append(sn30).append("\n");
        } catch (Exception ex) { sb.append("INCIDENTS: Could not retrieve\n"); }

        try {
            var q = qualityService.getSummary();
            sb.append("\nDATA QUALITY:\n");
            sb.append("- Pass rate: ").append(String.format("%.1f%%", q.getPassRate() * 100)).append("\n");
            sb.append("- Gate status: ").append(q.getGateStatus()).append("\n");
        } catch (Exception ex) { sb.append("DATA QUALITY: Could not retrieve\n"); }

        sb.append("\nSYSTEM CONTEXT:\n");
        sb.append("- 7 KPC pipeline sites monitored continuously\n");
        sb.append("- High-risk watch: site-003 (Makueni/Thange), site-006 (Sinendet)\n");
        sb.append("- Thange reference: Kimeu & 3,074 others v. KPC ([2025] KEELC 5239), KES 3.02B\n");
        sb.append("- Sinai reference: 2011 Nairobi pipeline fire, ~100 lives, undetected valve failure\n");

        return sb.toString();
    }

    // ── Safe data helpers ─────────────────────────────────────────────────────

    private long safeEventCount(LocalDateTime since)    { try { return eventService.countTotalEvents(since); } catch (Exception e) { return 0; } }
    private long safeOverfillCount(LocalDateTime since) { try { return eventService.countOverfillEvents(since); } catch (Exception e) { return 0; } }
    private long safeCountClosures(LocalDateTime since) { try { return actuationService.countSuccessfulClosures(since); } catch (Exception e) { return 0; } }
    private Double safeAvgLatency(LocalDateTime since)  { try { return actuationService.getAverageLatency(since); } catch (Exception e) { return null; } }
    private String safeSuccessRate(LocalDateTime since) { try { Double r = actuationService.getSuccessRate(since); return r != null ? String.format("%.1f%%", r) : "N/A"; } catch (Exception e) { return "N/A"; } }
    private long safeLitresSaved(LocalDateTime since)   { try { return actuationService.calculateLitresSaved(since); } catch (Exception e) { return 0; } }
    private long safeCapaCreated(LocalDateTime since)   { try { return capaRepository.countCreatedSince(since); } catch (Exception e) { return 0; } }
    private long safeCapaClosed()                        { try { Long v = capaRepository.countClosed(); return v != null ? v : 0; } catch (Exception e) { return 0; } }
    private long safeCapaOverdue()                       { try { Long v = capaRepository.countOverdue(LocalDate.now()); return v != null ? v : 0; } catch (Exception e) { return 0; } }
    private Double safeAvgCapaDays()                     { try { return capaRepository.avgClosureDays(); } catch (Exception e) { return null; } }
    private long safeIncidentsBySite(String site, LocalDateTime since) { try { return incidentRepository.countBySiteIdAndIncidentDateAfter(site, since); } catch (Exception e) { return 0; } }
    private String safeDataQualityGate()                 { try { return qualityService.getSummary().getGateStatus(); } catch (Exception e) { return "Unknown"; } }

    private String buildCapaHeadline(long overdue, long created30d) {
        if (overdue == 0 && created30d == 0) return "No CAPA activity in the last 30 days. System governance is current.";
        if (overdue > 0) return overdue + " CAPA" + (overdue > 1 ? "s" : "") + " overdue — requires immediate management attention.";
        return created30d + " CAPA" + (created30d > 1 ? "s" : "") + " created in the last 30 days. No overdue actions.";
    }

    private List<String> buildCapaInsights(long overdue, long created, long closed, Double avgDays) {
        var insights = new java.util.ArrayList<String>();
        if (overdue > 0) insights.add("Overdue CAPAs are a leading indicator of repeat incidents — " + overdue + " require immediate resolution.");
        if (created > 0 && closed == 0) insights.add("CAPAs are being created but none have been closed — follow-through gap in the corrective action process.");
        if (avgDays != null) insights.add("Average closure time of " + String.format("%.1f", avgDays) + " days should be benchmarked against the priority of each action.");
        if (insights.isEmpty()) insights.add("CAPA governance is current. Continue monitoring closure rates and due dates.");
        return insights;
    }

    // ── Fallback answer ───────────────────────────────────────────────────────

    private String buildFallbackAnswer(String question, String context) {
        String q = question.toLowerCase();
        if (q.contains("event") || q.contains("overfill") || q.contains("happened"))
            return "Based on live data: " + extractSection(context, "RECENT EVENTS");
        if (q.contains("capa") || q.contains("corrective"))
            return "Based on live data: " + extractSection(context, "CAPAs");
        if (q.contains("alert"))
            return "Based on live data: " + extractSection(context, "ALERTS");
        if (q.contains("valve") || q.contains("automat") || q.contains("response"))
            return "Based on live data: " + extractSection(context, "AUTOMATION");
        if (q.contains("sinai"))
            return "The 2011 Nairobi Sinai pipeline fire killed approximately 100 people. It began as a valve failure at a KPC storage tank — fuel leaked into a sewer, went undetected, and ignited. The critical gap was the absence of continuous automated monitoring. Sentinel closes exactly that gap.";
        if (q.contains("thange") || q.contains("kimeu"))
            return "In 2015, a fuel spill at the Makueni Pipeline Section (Thange River corridor) — same failure class as Sinai 2011. In 2025 the court ruled in Kimeu & 3,074 others v. KPC ([2025] KEELC 5239) — KES 3.02 billion gross award. Sentinel's site-003 is this site.";
        return "I have access to live Sentinel system data. Ask me about events, alerts, CAPAs, site risk, ESG metrics, or say 'generate a report' for a formatted summary.";
    }

    private String extractSection(String context, String sectionName) {
        int start = context.indexOf(sectionName);
        if (start < 0) return "Data not available.";
        int end = context.indexOf("\n\n", start + sectionName.length());
        return end > 0 ? context.substring(start, end).trim() : context.substring(start).trim();
    }

    // ── DTO ───────────────────────────────────────────────────────────────────

    public record ChatRequest(String question) {}
}
