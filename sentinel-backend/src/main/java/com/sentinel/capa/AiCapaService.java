package com.sentinel.capa;

import com.sentinel.alert.AlertEntity;
import com.sentinel.alert.AlertRepository;
import com.sentinel.event.EventEntity;
import com.sentinel.event.EventRepository;
import com.sentinel.site.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * AiCapaService — AI CAPA Writer.
 *
 * Generates a pre-filled CAPA draft using Groq LLM from the context of
 * a source alert or event. Returns three fields the HSE manager sees
 * pre-populated in the CAPA create form:
 *
 *   1. description      — what happened and what action is required
 *   2. rootCause        — AI-inferred root cause hypothesis
 *   3. suggestedActions — ordered list of corrective actions
 *
 * Design principles:
 * - Falls back to a template draft if LLM is unavailable (no crash, no blank form)
 * - Never saves a CAPA — draft only; the manager reviews before submitting
 * - 3-second hard timeout — never blocks the UI
 * - Sinai (2011) and Thange/Kimeu context injected for high-risk sites
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiCapaService {

    private final AlertRepository alertRepository;
    private final EventRepository eventRepository;
    private final IncidentRepository incidentRepository;

    @Value("${sentinel.llm.groq-api-key:}")
    private String groqApiKey;

    @Value("${sentinel.llm.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${sentinel.llm.timeout-ms:3000}")
    private int groqTimeoutMs;

    @Value("${sentinel.llm.enabled:true}")
    private boolean llmEnabled;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    private static final Set<String> HIGH_RISK_SITES = Set.of("site-003", "site-006");

    private static final Map<String, String> SITE_DISPLAY_NAMES = Map.of(
        "site-001", "Nairobi Terminal (Embakasi)",
        "site-002", "Mombasa Terminal (Kipevu)",
        "site-003", "Makueni Pipeline Section (Thange)",
        "site-004", "Nakuru Depot",
        "site-005", "Eldoret Terminal",
        "site-006", "Sinendet Pump Station",
        "site-007", "Kisumu Terminal"
    );

    private static final String CAPA_SYSTEM_PROMPT =
        "You are an HSE compliance officer at Kenya Pipeline Company (KPC) drafting a " +
        "Corrective and Preventive Action (CAPA) record after an operational incident. " +
        "Based on the incident context provided, generate a structured CAPA draft as a JSON object " +
        "with exactly three fields: " +
        "\"description\" (2-3 sentences: what happened, what risk it poses, what action is required), " +
        "\"rootCause\" (1-2 sentences: the most likely technical or procedural root cause), " +
        "\"suggestedActions\" (a numbered list of 3-5 specific corrective actions as a single string, each on a new line). " +
        "Keep all site names, tank IDs, event IDs, and legal references exactly as given. " +
        "Reference the 2011 Nairobi Sinai pipeline fire (~100 lives) when relevant to overfill or valve failure scenarios. " +
        "Return ONLY valid JSON with no markdown fences, no preamble, no explanation.";

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Generate an AI CAPA draft from a source alert ID.
     * Called by POST /api/capas/ai-draft?alertId=...
     */
    public AiCapaDraft draftFromAlert(String alertId) {
        Optional<AlertEntity> alertOpt = alertRepository.findById(alertId);
        if (alertOpt.isEmpty()) {
            return templateDraft("Alert " + alertId, "Unknown site", "High", null);
        }
        AlertEntity alert = alertOpt.get();
        String context = buildAlertContext(alert);
        return generateDraft(context, alert.getSiteId(), alert.getSeverity(), alertId, null);
    }

    /**
     * Generate an AI CAPA draft from a source event ID.
     * Called by POST /api/capas/ai-draft?eventId=...
     */
    public AiCapaDraft draftFromEvent(String eventId) {
        Optional<EventEntity> eventOpt = eventRepository.findById(eventId);
        if (eventOpt.isEmpty()) {
            return templateDraft("Event " + eventId, "Unknown site", "High", null);
        }
        EventEntity event = eventOpt.get();
        String context = buildEventContext(event);
        return generateDraft(context, event.getSiteId(), event.getSeverity(), null, eventId);
    }

    /**
     * Generate an AI CAPA draft from raw context (site, description, severity).
     * Fallback for when no alert/event ID is provided.
     */
    public AiCapaDraft draftFromContext(String siteId, String description, String severity) {
        String context = buildRawContext(siteId, description, severity);
        return generateDraft(context, siteId, severity, null, null);
    }

    // ── Context Builders ──────────────────────────────────────────────────────

    private String buildAlertContext(AlertEntity alert) {
        String site = displayName(alert.getSiteId());
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("INCIDENT TYPE: Alert — %s\n", alert.getRule()));
        sb.append(String.format("SITE: %s\n", site));
        sb.append(String.format("SEVERITY: %s\n", alert.getSeverity()));
        sb.append(String.format("ALERT TITLE: %s\n", alert.getTitle()));
        sb.append(String.format("ALERT TIME: %s\n",
            alert.getCreatedAt() != null
                ? alert.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))
                : "unknown"));
        if (alert.getNarrative() != null && !alert.getNarrative().isBlank()) {
            sb.append(String.format("INCIDENT NARRATIVE: %s\n", alert.getNarrative()));
        }
        if (HIGH_RISK_SITES.contains(alert.getSiteId())) {
            appendHighRiskContext(sb, alert.getSiteId());
        }
        appendIncidentHistory(sb, alert.getSiteId());
        return sb.toString();
    }

    private String buildEventContext(EventEntity event) {
        String site = displayName(event.getSiteId());
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("INCIDENT TYPE: Overfill Event — %s\n", event.getEventType()));
        sb.append(String.format("SITE: %s\n", site));
        sb.append(String.format("TANK: %s\n", event.getTankId()));
        sb.append(String.format("SEVERITY: %s\n", event.getSeverity()));
        sb.append(String.format("TANK LEVEL AT DETECTION: %s%%\n",
            event.getSignalValue() != null ? event.getSignalValue().toPlainString() : "unknown"));
        sb.append(String.format("EVENT TIME: %s\n",
            event.getCreatedAt() != null
                ? event.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))
                : "unknown"));
        sb.append(String.format("EVENT ID: %s\n", event.getEventId()));
        if (event.isActuationTriggered()) {
            sb.append("AUTOMATED RESPONSE: Sentinel triggered simulated valve closure via control plane.\n");
        }
        if (HIGH_RISK_SITES.contains(event.getSiteId())) {
            appendHighRiskContext(sb, event.getSiteId());
        }
        appendIncidentHistory(sb, event.getSiteId());
        return sb.toString();
    }

    private String buildRawContext(String siteId, String description, String severity) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("INCIDENT TYPE: Reported Incident\n"));
        sb.append(String.format("SITE: %s\n", displayName(siteId)));
        sb.append(String.format("SEVERITY: %s\n", severity));
        sb.append(String.format("DESCRIPTION: %s\n", description));
        if (HIGH_RISK_SITES.contains(siteId)) {
            appendHighRiskContext(sb, siteId);
        }
        appendIncidentHistory(sb, siteId);
        return sb.toString();
    }

    private void appendHighRiskContext(StringBuilder sb, String siteId) {
        if ("site-003".equals(siteId)) {
            sb.append("HIGH-RISK SITE CONTEXT: This is the Makueni Pipeline Section (Thange). ");
            sb.append("The 2015 Thange spill and subsequent Kimeu & 3,074 others v. KPC judgment ");
            sb.append("([2025] KEELC 5239, gross award KES 3.02B) resulted from undetected valve/tank failures. ");
        }
        sb.append("SINAI REFERENCE: The 2011 Nairobi Sinai pipeline fire (~100 lives lost) began as an ");
        sb.append("undetected valve failure at a KPC storage tank. Physical failures go undetected without ");
        sb.append("continuous monitoring of tank level, flow, and valve status. ");
        sb.append("This CAPA must close the detection gap.\n");
    }

    private void appendIncidentHistory(StringBuilder sb, String siteId) {
        try {
            long incidents30d = incidentRepository.countBySiteIdAndIncidentDateAfter(
                siteId, LocalDateTime.now().minusDays(30));
            if (incidents30d > 0) {
                sb.append(String.format("SITE HISTORY: %d incident(s) recorded at this site in the last 30 days.\n",
                    incidents30d));
            }
        } catch (Exception ex) {
            log.debug("AiCapaService: could not query incident history for site={}", siteId);
        }
    }

    // ── LLM Draft Generation ──────────────────────────────────────────────────

    private AiCapaDraft generateDraft(String context, String siteId,
                                      String severity, String alertId, String eventId) {
        // Try LLM first
        if (llmEnabled && groqApiKey != null && !groqApiKey.isBlank()) {
            try {
                AiCapaDraft llmDraft = callGroq(context);
                if (llmDraft != null) {
                    llmDraft.setSourceAlertId(alertId);
                    llmDraft.setSourceEventId(eventId);
                    llmDraft.setAiGenerated(true);
                    log.info("AiCapaService: LLM draft generated for site={}, severity={}", siteId, severity);
                    return llmDraft;
                }
            } catch (Exception ex) {
                log.debug("AiCapaService: LLM call failed, falling back to template: {}", ex.getMessage());
            }
        }

        // Fallback to template
        AiCapaDraft draft = templateDraft(context, displayName(siteId), severity, alertId);
        draft.setSourceEventId(eventId);
        return draft;
    }

    private AiCapaDraft callGroq(String context) {
        RestTemplate restTemplate = new RestTemplate();
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(groqTimeoutMs);
        factory.setReadTimeout(groqTimeoutMs);
        restTemplate.setRequestFactory(factory);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", groqModel);
        body.put("messages", List.of(
            Map.of("role", "system", "content", CAPA_SYSTEM_PROMPT),
            Map.of("role", "user", "content", context)
        ));
        body.put("max_tokens", 500);
        body.put("temperature", 0.2);  // Very low — we want precise, factual output
        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

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

        // Parse JSON response
        return parseJsonDraft(content.trim());
    }

    @SuppressWarnings("unchecked")
    private AiCapaDraft parseJsonDraft(String json) {
        try {
            // Use Spring's RestTemplate ObjectMapper via a simple approach
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, String> parsed = mapper.readValue(json, Map.class);

            AiCapaDraft draft = new AiCapaDraft();
            draft.setDescription(parsed.getOrDefault("description", ""));
            draft.setRootCause(parsed.getOrDefault("rootCause", ""));
            draft.setSuggestedActions(parsed.getOrDefault("suggestedActions", ""));
            return draft;
        } catch (Exception ex) {
            log.debug("AiCapaService: JSON parse failed: {}", ex.getMessage());
            return null;
        }
    }

    // ── Template Fallback ─────────────────────────────────────────────────────

    private AiCapaDraft templateDraft(String context, String siteName,
                                      String severity, String alertId) {
        AiCapaDraft draft = new AiCapaDraft();
        draft.setDescription(String.format(
            "A %s-severity incident was detected at %s requiring corrective action. " +
            "The identified condition poses a risk of physical failure and must be addressed " +
            "to prevent escalation consistent with the 2011 Sinai pipeline incident pattern. " +
            "Immediate investigation and remediation are required.",
            severity, siteName));
        draft.setRootCause(
            "Likely root cause: absence or failure of continuous monitoring of tank level, " +
            "flow rate, or valve status, allowing a developing condition to remain undetected " +
            "until threshold breach. Secondary factor: delayed or incomplete corrective action " +
            "from prior audit findings.");
        draft.setSuggestedActions(
            "1. Inspect and verify current valve status and tank level readings at the affected asset.\n" +
            "2. Review all open audit findings for this site and assign closure deadlines within 14 days.\n" +
            "3. Confirm Sentinel automated interlock is active and threshold parameters are correctly set.\n" +
            "4. Schedule a full site HSE inspection within 48 hours.\n" +
            "5. Document root cause findings and share with Regional HSE Coordinator.");
        draft.setSourceAlertId(alertId);
        draft.setAiGenerated(false);
        return draft;
    }

    private String displayName(String siteId) {
        return SITE_DISPLAY_NAMES.getOrDefault(siteId,
            siteId != null ? siteId.toUpperCase() : "Unknown Site");
    }

    // ── Response DTO ──────────────────────────────────────────────────────────

    @lombok.Data
    @lombok.NoArgsConstructor
    public static class AiCapaDraft {
        private String description;
        private String rootCause;
        private String suggestedActions;
        private String sourceAlertId;
        private String sourceEventId;
        private boolean aiGenerated;
    }
}
