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
 * SmsNotificationService - Sends SMS alerts via Africa's Talking HTTP API.
 * 
 * Used for Critical severity alerts only - provides immediate notification
 * to on-call personnel when Slack alone may not suffice (after-hours, 
 * actuation failures, etc.).
 * 
 * Follows the same graceful-failure pattern as SlackNotificationService:
 * - Never throws exceptions to callers
 * - SMS failure never blocks alert creation or processing
 * - Logs warnings on failure, returns false to caller
 * 
 * Africa's Talking API: https://africastalking.com/sms
 */
@Service
@Slf4j
public class SmsNotificationService {

    // ── Africa's Talking Configuration ─────────────────────────────────────────
    
    @Value("${sentinel.sms.api-url:https://api.africastalking.com/version1/messaging}")
    private String apiUrl;

    @Value("${sentinel.sms.api-key:}")
    private String apiKey;

    @Value("${sentinel.sms.username:}")
    private String username;

    @Value("${sentinel.sms.sender-id:SENTINEL}")
    private String senderId;

    @Value("${sentinel.sms.enabled:false}")
    private boolean enabled;

    @Value("${sentinel.sms.critical-only:true}")
    private boolean criticalOnly;

    @Value("${sentinel.dashboard.url:http://localhost:3000}")
    private String dashboardUrl;

    private final SmsContactRepository contactRepository;
    private final RestTemplate restTemplate;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public SmsNotificationService(SmsContactRepository contactRepository) {
        this.contactRepository = contactRepository;
        this.restTemplate = new RestTemplate();
    }

    // ── Main Notification Methods ──────────────────────────────────────────────

    /**
     * Send SMS alert for a Critical overfill event with actuation result.
     * Only sends if severity is Critical (or criticalOnly is disabled).
     * Returns true if sent successfully to at least one recipient, false otherwise.
     */
    public boolean sendOverfillAlert(EventEntity event, ActuationService.ActuationResult actuationResult) {
        if (!shouldSend(event)) {
            return true; // Not an error - just filtered out
        }

        List<SmsContactEntity> recipients = contactRepository.findByActiveTrue();
        if (recipients.isEmpty()) {
            log.warn("SMS notifications enabled but no active contacts configured");
            return false;
        }

        String message = buildOverfillMessage(event, actuationResult);
        return sendToRecipients(message, recipients, event.getEventId());
    }

    /**
     * Send SMS alert for an event without actuation result.
     */
    public boolean sendEventAlert(EventEntity event) {
        if (!shouldSend(event)) {
            return true;
        }

        List<SmsContactEntity> recipients = contactRepository.findByActiveTrue();
        if (recipients.isEmpty()) {
            log.warn("SMS notifications enabled but no active contacts configured");
            return false;
        }

        String message = buildEventMessage(event);
        return sendToRecipients(message, recipients, event.getEventId());
    }

    /**
     * Send a simple text message to all active contacts.
     * Used for test notifications and manual alerts.
     */
    public boolean sendSimpleMessage(String message) {
        if (!enabled || apiKey.isBlank()) {
            log.info("SMS notifications disabled - would send: {}", message);
            return true;
        }

        List<SmsContactEntity> recipients = contactRepository.findByActiveTrue();
        if (recipients.isEmpty()) {
            log.warn("SMS notifications enabled but no active contacts configured");
            return false;
        }

        return sendToRecipients(message, recipients, "MANUAL");
    }

    /**
     * Send SMS to a specific phone number (for testing).
     */
    public boolean sendToNumber(String phoneNumber, String message) {
        if (!enabled || apiKey.isBlank()) {
            log.info("SMS notifications disabled - would send to {}: {}", phoneNumber, message);
            return true;
        }

        return sendSms(phoneNumber, message);
    }

    // ── Message Builders ───────────────────────────────────────────────────────

    /**
     * Build concise SMS message for overfill event with actuation status.
     * SMS has 160 char limit for single message - keep it tight.
     */
    private String buildOverfillMessage(EventEntity event, ActuationService.ActuationResult actuationResult) {
        String actuationStatus = actuationResult != null 
            ? (actuationResult.success() ? "VALVE CLOSED" : "VALVE FAILED") 
            : "NO ACTUATION";

        // Format: [CRITICAL] OVERFILL site-001 Tank-A 97.5% - VALVE CLOSED - 14:32
        return String.format("[%s] OVERFILL %s %s %.1f%% - %s - %s",
            event.getSeverity().toUpperCase(),
            event.getSiteId(),
            event.getTankId(),
            event.getSignalValue() != null ? event.getSignalValue().doubleValue() : 0.0,
            actuationStatus,
            event.getCreatedAt().format(TIME_FORMAT)
        );
    }

    /**
     * Build SMS message for generic event alert.
     */
    private String buildEventMessage(EventEntity event) {
        return String.format("[%s] %s at %s - %s - %s",
            event.getSeverity().toUpperCase(),
            formatEventType(event.getEventType()),
            event.getSiteId(),
            event.getDescription() != null ? truncate(event.getDescription(), 60) : "Alert",
            event.getCreatedAt().format(TIME_FORMAT)
        );
    }

    // ── Africa's Talking API Integration ───────────────────────────────────────

    /**
     * Send SMS to multiple recipients via Africa's Talking bulk API.
     */
    private boolean sendToRecipients(String message, List<SmsContactEntity> recipients, String eventRef) {
        // Build comma-separated phone numbers for bulk send
        String phoneNumbers = recipients.stream()
            .map(SmsContactEntity::getPhoneNumber)
            .reduce((a, b) -> a + "," + b)
            .orElse("");

        if (phoneNumbers.isBlank()) {
            return false;
        }

        log.info("Sending SMS for event {} to {} recipients", eventRef, recipients.size());
        return sendSms(phoneNumbers, message);
    }

    /**
     * Send SMS via Africa's Talking HTTP API.
     * 
     * API expects application/x-www-form-urlencoded POST with:
     * - username: AT account username
     * - to: comma-separated phone numbers (international format +254...)
     * - message: SMS content
     * - from: sender ID (optional, requires approval from AT)
     */
    private boolean sendSms(String phoneNumbers, String message) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("apiKey", apiKey);
            headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);

            // Build form data
            String formData = String.format(
                "username=%s&to=%s&message=%s",
                urlEncode(username),
                urlEncode(phoneNumbers),
                urlEncode(message)
            );

            // Add sender ID if configured (requires AT approval)
            if (senderId != null && !senderId.isBlank()) {
                formData += "&from=" + urlEncode(senderId);
            }

            HttpEntity<String> request = new HttpEntity<>(formData, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> body = response.getBody();
                if (body != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> smsData = (Map<String, Object>) body.get("SMSMessageData");
                    if (smsData != null) {
                        String resultMessage = (String) smsData.get("Message");
                        log.info("SMS sent successfully: {}", resultMessage);
                        return true;
                    }
                }
                log.info("SMS sent - response: {}", body);
                return true;
            } else {
                log.warn("SMS API returned non-success status: {}", response.getStatusCode());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to send SMS: {}", e.getMessage());
            return false;
        }
    }

    // ── Helper Methods ─────────────────────────────────────────────────────────

    /**
     * Determine if SMS should be sent for this event.
     * Respects enabled flag, API key presence, and criticalOnly filter.
     */
    private boolean shouldSend(EventEntity event) {
        if (!enabled) {
            log.debug("SMS notifications disabled - skipping event {}", event.getEventId());
            return false;
        }
        
        if (apiKey.isBlank()) {
            log.debug("SMS API key not configured - skipping event {}", event.getEventId());
            return false;
        }

        if (criticalOnly && !"Critical".equalsIgnoreCase(event.getSeverity())) {
            log.debug("SMS criticalOnly=true, skipping {} severity event {}", 
                event.getSeverity(), event.getEventId());
            return false;
        }

        return true;
    }

    private String formatEventType(String eventType) {
        return switch (eventType) {
            case "overfill_risk" -> "OVERFILL";
            case "pressure_breach" -> "PRESSURE";
            case "threshold_warning" -> "WARNING";
            default -> "ALERT";
        };
    }

    private String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + "...";
    }

    private String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return value;
        }
    }

    // ── Test/Demo Methods ──────────────────────────────────────────────────────

    /**
     * Send a test SMS to verify Africa's Talking integration.
     */
    public boolean sendTestNotification() {
        return sendSimpleMessage("Sentinel V4 SMS integration test - " + 
            java.time.LocalDateTime.now().format(TIME_FORMAT));
    }

    /**
     * Check if SMS service is properly configured.
     */
    public SmsStatus getStatus() {
        return new SmsStatus(
            enabled,
            !apiKey.isBlank(),
            !username.isBlank(),
            contactRepository.countByActiveTrue()
        );
    }

    /**
     * Status DTO for health checks.
     */
    public record SmsStatus(
        boolean enabled,
        boolean apiKeyConfigured,
        boolean usernameConfigured,
        long activeContacts
    ) {
        public boolean isReady() {
            return enabled && apiKeyConfigured && usernameConfigured && activeContacts > 0;
        }
    }
}
