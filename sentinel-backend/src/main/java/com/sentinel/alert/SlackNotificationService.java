package com.sentinel.alert;

import com.sentinel.actuation.ActuationService;
import com.sentinel.event.EventEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * SlackNotificationService - Sends rich Slack notifications for control-plane events.
 * 
 * Uses Slack Block Kit for visually appealing messages showing:
 * - Event details (site, tank, severity)
 * - Actuation status (success/failure)
 * - Direct link to dashboard
 * 
 * Graceful failure handling - never throws exceptions to callers.
 */
@Service
@Slf4j
public class SlackNotificationService {

    @Value("${sentinel.slack.webhook-url:}")
    private String webhookUrl;

    @Value("${sentinel.slack.enabled:false}")
    private boolean enabled;

    @Value("${sentinel.slack.channel:#sentinel-alerts}")
    private String channel;

    @Value("${sentinel.dashboard.url:http://localhost:3000}")
    private String dashboardUrl;

    private final RestTemplate restTemplate;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");

    public SlackNotificationService() {
        this.restTemplate = new RestTemplate();
    }

    // ── Main Notification Methods ──────────────────────────────────────────────

    /**
     * Send alert notification for an overfill event.
     * Returns true if sent successfully, false otherwise.
     */
    public boolean sendOverfillAlert(EventEntity event, ActuationService.ActuationResult actuationResult) {
        if (!enabled || webhookUrl.isBlank()) {
            log.info("Slack notifications disabled - would send overfill alert for event {}", event.getEventId());
            return true; // Return true so caller doesn't think it failed
        }

        try {
            Map<String, Object> payload = buildOverfillAlertPayload(event, actuationResult);
            return sendToSlack(payload);
        } catch (Exception e) {
            log.error("Failed to send Slack notification for event {}: {}", event.getEventId(), e.getMessage());
            return false;
        }
    }

    /**
     * Send a simple text notification.
     */
    public boolean sendSimpleMessage(String message) {
        if (!enabled || webhookUrl.isBlank()) {
            log.info("Slack notifications disabled - would send: {}", message);
            return true;
        }

        try {
            Map<String, Object> payload = Map.of(
                "channel", channel,
                "text", message
            );
            return sendToSlack(payload);
        } catch (Exception e) {
            log.error("Failed to send Slack message: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Send event notification without actuation result.
     */
    public boolean sendEventAlert(EventEntity event) {
        if (!enabled || webhookUrl.isBlank()) {
            log.info("Slack notifications disabled - would send alert for event {}", event.getEventId());
            return true;
        }

        try {
            Map<String, Object> payload = buildEventAlertPayload(event);
            return sendToSlack(payload);
        } catch (Exception e) {
            log.error("Failed to send Slack notification for event {}: {}", event.getEventId(), e.getMessage());
            return false;
        }
    }

    // ── Slack Block Kit Payload Builders ───────────────────────────────────────

    /**
     * Build rich Slack Block Kit payload for overfill alert with actuation result.
     */
    private Map<String, Object> buildOverfillAlertPayload(
            EventEntity event, 
            ActuationService.ActuationResult actuationResult) {
        
        String severityEmoji = getSeverityEmoji(event.getSeverity());
        String actuationEmoji = actuationResult != null && actuationResult.success() ? ":white_check_mark:" : ":x:";
        String actuationStatus = actuationResult != null 
            ? (actuationResult.success() ? "Valve Closed Successfully" : "Valve Close Failed: " + actuationResult.errorMessage())
            : "No actuation triggered";

        List<Map<String, Object>> blocks = List.of(
            // Header
            Map.of(
                "type", "header",
                "text", Map.of(
                    "type", "plain_text",
                    "text", severityEmoji + " Overfill Risk Detected",
                    "emoji", true
                )
            ),
            // Event Details Section
            Map.of(
                "type", "section",
                "fields", List.of(
                    Map.of("type", "mrkdwn", "text", "*Site:*\n" + event.getSiteId()),
                    Map.of("type", "mrkdwn", "text", "*Tank:*\n" + event.getTankId()),
                    Map.of("type", "mrkdwn", "text", "*Tank Level:*\n" + formatLevel(event.getSignalValue()) + "%"),
                    Map.of("type", "mrkdwn", "text", "*Severity:*\n" + event.getSeverity()),
                    Map.of("type", "mrkdwn", "text", "*Event ID:*\n" + event.getEventId()),
                    Map.of("type", "mrkdwn", "text", "*Time:*\n" + event.getCreatedAt().format(TIME_FORMAT))
                )
            ),
            // Divider
            Map.of("type", "divider"),
            // Actuation Status Section
            Map.of(
                "type", "section",
                "text", Map.of(
                    "type", "mrkdwn",
                    "text", actuationEmoji + " *Automated Response:* " + actuationStatus
                )
            ),
            // Context with Thange connection
            Map.of(
                "type", "context",
                "elements", List.of(
                    Map.of(
                        "type", "mrkdwn",
                        "text", ":brain: *Thange Judgment:* Tank level breach detected by ML model. Automated valve closure initiated to prevent spill."
                    )
                )
            ),
            // Dashboard Link Button
            Map.of(
                "type", "actions",
                "elements", List.of(
                    Map.of(
                        "type", "button",
                        "text", Map.of(
                            "type", "plain_text",
                            "text", "View in Dashboard",
                            "emoji", true
                        ),
                        "url", dashboardUrl + "/executive",
                        "style", "primary"
                    )
                )
            )
        );

        return Map.of(
            "channel", channel,
            "blocks", blocks,
            "text", String.format("Overfill risk at %s - Tank %s at %.1f%%", 
                event.getSiteId(), event.getTankId(), 
                event.getSignalValue() != null ? event.getSignalValue().doubleValue() : 0.0)
        );
    }

    /**
     * Build simpler payload for event-only alerts.
     */
    private Map<String, Object> buildEventAlertPayload(EventEntity event) {
        String severityEmoji = getSeverityEmoji(event.getSeverity());

        List<Map<String, Object>> blocks = List.of(
            Map.of(
                "type", "header",
                "text", Map.of(
                    "type", "plain_text",
                    "text", severityEmoji + " " + formatEventType(event.getEventType()),
                    "emoji", true
                )
            ),
            Map.of(
                "type", "section",
                "fields", List.of(
                    Map.of("type", "mrkdwn", "text", "*Site:*\n" + event.getSiteId()),
                    Map.of("type", "mrkdwn", "text", "*Severity:*\n" + event.getSeverity()),
                    Map.of("type", "mrkdwn", "text", "*Event ID:*\n" + event.getEventId()),
                    Map.of("type", "mrkdwn", "text", "*Time:*\n" + event.getCreatedAt().format(TIME_FORMAT))
                )
            ),
            Map.of(
                "type", "actions",
                "elements", List.of(
                    Map.of(
                        "type", "button",
                        "text", Map.of("type", "plain_text", "text", "View Dashboard"),
                        "url", dashboardUrl + "/executive"
                    )
                )
            )
        );

        return Map.of(
            "channel", channel,
            "blocks", blocks,
            "text", event.getDescription()
        );
    }

    // ── Helper Methods ─────────────────────────────────────────────────────────

    private boolean sendToSlack(Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, request, String.class);
            boolean success = response.getStatusCode().is2xxSuccessful();
            if (success) {
                log.info("Slack notification sent successfully");
            } else {
                log.warn("Slack API returned non-success status: {}", response.getStatusCode());
            }
            return success;
        } catch (Exception e) {
            log.error("Failed to post to Slack webhook: {}", e.getMessage());
            return false;
        }
    }

    private String getSeverityEmoji(String severity) {
        return switch (severity) {
            case "Critical" -> ":rotating_light:";
            case "High" -> ":warning:";
            case "Medium" -> ":large_yellow_circle:";
            default -> ":information_source:";
        };
    }

    private String formatEventType(String eventType) {
        return switch (eventType) {
            case "overfill_risk" -> "Overfill Risk Detected";
            case "pressure_breach" -> "Pressure Threshold Breach";
            case "threshold_warning" -> "Threshold Warning";
            default -> "System Alert";
        };
    }

    private String formatLevel(java.math.BigDecimal level) {
        return level != null ? String.format("%.1f", level.doubleValue()) : "N/A";
    }

    // ── Test/Demo Method ───────────────────────────────────────────────────────

    /**
     * Send a test notification to verify Slack integration.
     */
    public boolean sendTestNotification() {
        return sendSimpleMessage(":test_tube: Sentinel V4 Control Plane - Slack integration test successful!");
    }
}
