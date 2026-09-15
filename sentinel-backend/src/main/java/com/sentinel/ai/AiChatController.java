package com.sentinel.ai;

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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * AiChatController — Sentinel AI Assistant.
 *
 * A floating chat bot that answers questions about the Sentinel system
 * using live operational data as context. The user can ask anything:
 * "What happened recently?", "Which sites are most at risk?",
 * "What CAPAs are overdue?", "Explain the Thange judgment", etc.
 *
 * POST /api/ai/chat
 * Body: { "question": "..." }
 * Returns: { "answer": "..." }
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

    @Value("${sentinel.llm.groq-api-key:}")
    private String groqApiKey;

    @Value("${sentinel.llm.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${sentinel.llm.enabled:true}")
    private boolean llmEnabled;

    private static final String GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
    private static final int    TIMEOUT_MS = 8000;
    private static final int    MAX_TOKENS = 600;

    private static final String SYSTEM_PROMPT = """
        You are Sentinel AI — an intelligent assistant for the Sentinel pipeline safety and ESG \
        monitoring system built for Kenya Pipeline Company (KPC).

        You have access to live operational data provided in the context below. Use it to answer \
        the user's question accurately and concisely.

        Your role:
        - Answer questions about pipeline incidents, alerts, CAPAs, ESG metrics, and site safety
        - Explain what the data means in plain language
        - Reference the Sinai 2011 and Thange/Kimeu context when relevant
        - Be direct and helpful — this is an operations tool, not a chatbot

        Rules:
        - Only use the data provided. Do not invent numbers.
        - If data is unavailable, say so clearly.
        - Keep answers concise — 3-5 sentences unless the question requires more.
        - Never claim legal liability or confirmed root causes.
        - Always distinguish between confirmed facts and analysis.
        """;

    // ── Chat endpoint ─────────────────────────────────────────────────────────

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatRequest request) {
        if (request.question() == null || request.question().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("answer", "Please ask a question."));
        }

        log.info("AiChatController: question received: {}", request.question().substring(0, Math.min(80, request.question().length())));

        String context = assembleContext();
        String answer  = askGroq(request.question(), context);

        return ResponseEntity.ok(Map.of("answer", answer));
    }

    // ── Context assembly ──────────────────────────────────────────────────────

    private String assembleContext() {
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);
        LocalDateTime since7d  = LocalDateTime.now().minusDays(7);
        StringBuilder sb = new StringBuilder();

        sb.append("=== SENTINEL LIVE SYSTEM STATUS ===\n");
        sb.append("Generated: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"))).append(" UTC\n\n");

        // Events
        try {
            long events30d  = eventService.countTotalEvents(since30d);
            long overfills  = eventService.countOverfillEvents(since30d);
            var  recent     = eventService.getRecentEvents(5);
            sb.append("RECENT EVENTS (last 30 days):\n");
            sb.append("- Total events: ").append(events30d).append("\n");
            sb.append("- Overfill events: ").append(overfills).append("\n");
            if (!recent.isEmpty()) {
                sb.append("- Most recent events:\n");
                recent.forEach(e -> sb.append("  * ").append(e.getSeverity())
                    .append(" | ").append(e.getSiteId())
                    .append(" | Tank ").append(e.getTankId())
                    .append(" | ").append(e.getSignalValue() != null ? e.getSignalValue().toPlainString() + "%" : "")
                    .append(" | ").append(e.getCreatedAt() != null ? e.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM HH:mm")) : "")
                    .append("\n"));
            }
        } catch (Exception ex) {
            sb.append("EVENTS: Could not retrieve\n");
        }

        // Actuation
        try {
            long closures   = actuationService.countSuccessfulClosures(since30d);
            Double avgMs    = actuationService.getAverageLatency(since30d);
            Double rate     = actuationService.getSuccessRate(since30d);
            long litres     = actuationService.calculateLitresSaved(since30d);
            sb.append("\nAUTOMATION (last 30 days):\n");
            sb.append("- Successful valve closures: ").append(closures).append("\n");
            sb.append("- Avg response time: ").append(avgMs != null ? String.format("%.1fs", avgMs / 1000.0) : "N/A").append("\n");
            sb.append("- Success rate: ").append(rate != null ? String.format("%.1f%%", rate) : "N/A").append("\n");
            sb.append("- Estimated litres saved: ").append(litres).append("L\n");
        } catch (Exception ex) {
            sb.append("AUTOMATION: Could not retrieve\n");
        }

        // Alerts
        try {
            long total      = alertRepository.count();
            long active     = alertRepository.findByStatusOrderByCreatedAtDesc("active").size();
            long acked      = alertRepository.findByStatusOrderByCreatedAtDesc("acknowledged").size();
            sb.append("\nALERTS:\n");
            sb.append("- Total alerts: ").append(total).append("\n");
            sb.append("- Active (unacknowledged): ").append(active).append("\n");
            sb.append("- Acknowledged: ").append(acked).append("\n");
        } catch (Exception ex) {
            sb.append("ALERTS: Could not retrieve\n");
        }

        // CAPAs
        try {
            Long closed     = capaRepository.countClosed();
            Long overdue    = capaRepository.countOverdue(java.time.LocalDate.now());
            long created30d = capaRepository.countCreatedSince(since30d);
            Double avgDays  = capaRepository.avgClosureDays();
            sb.append("\nCAPAs (CORRECTIVE ACTIONS):\n");
            sb.append("- Created last 30 days: ").append(created30d).append("\n");
            sb.append("- Closed (total): ").append(closed != null ? closed : 0).append("\n");
            sb.append("- Overdue: ").append(overdue != null ? overdue : 0).append("\n");
            sb.append("- Avg closure time: ").append(avgDays != null ? String.format("%.1f days", avgDays) : "No closures yet").append("\n");
        } catch (Exception ex) {
            sb.append("CAPAs: Could not retrieve\n");
        }

        // Incidents
        try {
            long total = incidentRepository.countAll();
            sb.append("\nINCIDENTS:\n");
            sb.append("- Total recorded: ").append(total).append("\n");
            // High-risk sites
            long site003 = incidentRepository.countBySiteIdAndIncidentDateAfter("site-003", since30d);
            long site006 = incidentRepository.countBySiteIdAndIncidentDateAfter("site-006", since30d);
            if (site003 > 0) sb.append("- Makueni (Thange) last 30d: ").append(site003).append("\n");
            if (site006 > 0) sb.append("- Sinendet last 30d: ").append(site006).append("\n");
        } catch (Exception ex) {
            sb.append("INCIDENTS: Could not retrieve\n");
        }

        // Data quality
        try {
            var q = qualityService.getSummary();
            sb.append("\nDATA QUALITY:\n");
            sb.append("- Pass rate: ").append(String.format("%.1f%%", q.getPassRate() * 100)).append("\n");
            sb.append("- Gate status: ").append(q.getGateStatus()).append("\n");
            sb.append("- Records processed: ").append(q.getTotal()).append("\n");
        } catch (Exception ex) {
            sb.append("DATA QUALITY: Could not retrieve\n");
        }

        // System context
        sb.append("\nSYSTEM CONTEXT:\n");
        sb.append("- 7 KPC pipeline sites monitored continuously\n");
        sb.append("- High-risk watch list: site-003 (Makueni/Thange), site-006 (Sinendet)\n");
        sb.append("- Thange reference: Kimeu & 3,074 others v. KPC ([2025] KEELC 5239), KES 3.02B\n");
        sb.append("- Sinai reference: 2011 Nairobi pipeline fire, ~100 lives, undetected valve failure\n");

        return sb.toString();
    }

    // ── Groq call ─────────────────────────────────────────────────────────────

    private String askGroq(String question, String context) {
        if (!llmEnabled || groqApiKey == null || groqApiKey.isBlank()) {
            return buildFallbackAnswer(question, context);
        }

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(TIMEOUT_MS);
            factory.setReadTimeout(TIMEOUT_MS);
            RestTemplate restTemplate = new RestTemplate(factory);

            String userMessage = "LIVE SYSTEM DATA:\n" + context + "\n\nQUESTION: " + question;

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", groqModel);
            body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user",   "content", userMessage)
            ));
            body.put("max_tokens", MAX_TOKENS);
            body.put("temperature", 0.3);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                GROQ_URL, new HttpEntity<>(body, headers), Map.class);

            if (response == null) return buildFallbackAnswer(question, context);

            @SuppressWarnings("unchecked")
            var choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return buildFallbackAnswer(question, context);

            @SuppressWarnings("unchecked")
            var message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) return buildFallbackAnswer(question, context);

            String content = (String) message.get("content");
            return (content != null && !content.isBlank()) ? content.trim() : buildFallbackAnswer(question, context);

        } catch (Exception ex) {
            log.warn("AiChatController: Groq call failed: {}", ex.getMessage());
            return buildFallbackAnswer(question, context);
        }
    }

    // ── Fallback when no LLM key ──────────────────────────────────────────────

    private String buildFallbackAnswer(String question, String context) {
        // Return the relevant section of the context as a plain answer
        String q = question.toLowerCase();
        if (q.contains("event") || q.contains("overfill") || q.contains("happened")) {
            return "Based on live data: " + extractSection(context, "RECENT EVENTS");
        }
        if (q.contains("capa") || q.contains("corrective") || q.contains("action")) {
            return "Based on live data: " + extractSection(context, "CAPAs");
        }
        if (q.contains("alert")) {
            return "Based on live data: " + extractSection(context, "ALERTS");
        }
        if (q.contains("valve") || q.contains("automat") || q.contains("response")) {
            return "Based on live data: " + extractSection(context, "AUTOMATION");
        }
        if (q.contains("quality") || q.contains("data")) {
            return "Based on live data: " + extractSection(context, "DATA QUALITY");
        }
        if (q.contains("sinai") || q.contains("thange") || q.contains("kimeu") || q.contains("esg")) {
            return "Sentinel monitors 7 KPC pipeline sites continuously. The 2011 Sinai fire (~100 lives) and 2015 Thange spill (Kimeu v. KPC, KES 3.02B judgment) both began as undetected valve failures. Sentinel closes that gap — detecting threshold breaches in seconds and triggering automated valve closures.";
        }
        return "I can see the following live data about the Sentinel system:\n\n" + context.substring(0, Math.min(400, context.length())) + "...\n\nFor more specific questions, please ask about events, alerts, CAPAs, automation, or ESG metrics.";
    }

    private String extractSection(String context, String sectionName) {
        int start = context.indexOf(sectionName);
        if (start < 0) return "Data not available.";
        int end = context.indexOf("\n\n", start + sectionName.length());
        return end > 0 ? context.substring(start, end).trim() : context.substring(start).trim();
    }

    // ── Request DTO ───────────────────────────────────────────────────────────

    public record ChatRequest(String question) {}
}
