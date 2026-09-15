package com.sentinel.alert;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * SmsContactEntity - Stores phone numbers for SMS alert recipients.
 * 
 * On-call engineers, site managers, and emergency contacts can be added here.
 * Phone numbers must be in international format (e.g., +254712345678 for Kenya).
 * 
 * The active flag allows temporarily disabling contacts without deletion.
 */
@Entity
@Table(name = "sms_contacts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmsContactEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Contact name (e.g., "John Doe - On-Call Engineer")
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Phone number in international format.
     * Must include country code (e.g., +254712345678 for Kenya)
     */
    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    /**
     * Role or category for filtering (e.g., "on_call", "site_manager", "emergency")
     */
    @Column(length = 50)
    private String role;

    /**
     * Optional site ID if contact is site-specific.
     * Null means contact receives alerts for all sites.
     */
    @Column(name = "site_id", length = 20)
    private String siteId;

    /**
     * Whether this contact should receive SMS alerts.
     * Allows temporarily disabling without deletion.
     */
    @Column(nullable = false)
    private boolean active = true;

    /**
     * Minimum severity level for this contact.
     * null or "Critical" = Critical only (default behavior)
     * "High" = High and Critical
     * "Medium" = Medium, High, and Critical
     */
    @Column(name = "min_severity", length = 20)
    private String minSeverity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── Factory Methods ────────────────────────────────────────────────────────

    /**
     * Create an on-call engineer contact (receives Critical alerts only).
     */
    public static SmsContactEntity createOnCallEngineer(String name, String phoneNumber) {
        SmsContactEntity contact = new SmsContactEntity();
        contact.setName(name);
        contact.setPhoneNumber(normalizePhoneNumber(phoneNumber));
        contact.setRole("on_call");
        contact.setActive(true);
        contact.setMinSeverity("Critical");
        return contact;
    }

    /**
     * Create a site manager contact for a specific site.
     */
    public static SmsContactEntity createSiteManager(String name, String phoneNumber, String siteId) {
        SmsContactEntity contact = new SmsContactEntity();
        contact.setName(name);
        contact.setPhoneNumber(normalizePhoneNumber(phoneNumber));
        contact.setRole("site_manager");
        contact.setSiteId(siteId);
        contact.setActive(true);
        contact.setMinSeverity("High");
        return contact;
    }

    /**
     * Create an emergency contact (all Critical alerts, all sites).
     */
    public static SmsContactEntity createEmergencyContact(String name, String phoneNumber) {
        SmsContactEntity contact = new SmsContactEntity();
        contact.setName(name);
        contact.setPhoneNumber(normalizePhoneNumber(phoneNumber));
        contact.setRole("emergency");
        contact.setActive(true);
        contact.setMinSeverity("Critical");
        return contact;
    }

    // ── Helper Methods ─────────────────────────────────────────────────────────

    /**
     * Normalize phone number to international format.
     * Handles common Kenyan formats.
     */
    private static String normalizePhoneNumber(String phone) {
        if (phone == null) return null;
        
        // Remove spaces, dashes, parentheses
        String normalized = phone.replaceAll("[\\s\\-\\(\\)]", "");
        
        // If starts with 0, assume Kenya and add +254
        if (normalized.startsWith("0") && normalized.length() == 10) {
            normalized = "+254" + normalized.substring(1);
        }
        
        // If starts with 254 without +, add +
        if (normalized.startsWith("254") && !normalized.startsWith("+")) {
            normalized = "+" + normalized;
        }
        
        return normalized;
    }

    /**
     * Check if this contact should receive an alert based on severity and site.
     */
    public boolean shouldReceiveAlert(String severity, String alertSiteId) {
        if (!active) return false;
        
        // Site filter: null siteId means all sites
        if (siteId != null && !siteId.equals(alertSiteId)) {
            return false;
        }
        
        // Severity filter
        return matchesSeverity(severity);
    }

    private boolean matchesSeverity(String severity) {
        if (minSeverity == null || "Critical".equalsIgnoreCase(minSeverity)) {
            return "Critical".equalsIgnoreCase(severity);
        }
        if ("High".equalsIgnoreCase(minSeverity)) {
            return "Critical".equalsIgnoreCase(severity) || "High".equalsIgnoreCase(severity);
        }
        if ("Medium".equalsIgnoreCase(minSeverity)) {
            return "Critical".equalsIgnoreCase(severity) 
                || "High".equalsIgnoreCase(severity) 
                || "Medium".equalsIgnoreCase(severity);
        }
        return false;
    }
}
