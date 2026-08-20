package com.sentinel.alert;

import com.sentinel.common.dto.AlertDto;
import com.sentinel.site.SiteEntity;
import com.sentinel.site.SiteRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Alert service — generates, persists, and queries alerts.
 * Each alert links back to the specific record(s) and rule that produced it,
 * carrying forward Stage 1's "traceable reason" principle.
 *
 * Performance notes:
 * - siteNameCache: The dim_site table is a static 6-row lookup. Loading it once
 *   on startup eliminates a redundant DB round-trip on every GET /api/alerts call.
 *   The cache is a ConcurrentHashMap so it is safe for concurrent reads.
 *   If sites were ever updated at runtime, call refreshSiteCache() or restart.
 */
@Service
public class AlertService {

    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private final AlertRepository alertRepository;
    private final SiteRepository  siteRepository;

    // Loaded once at startup — 6 rows, never changes in practice.
    private final Map<String, String> siteNameCache = new ConcurrentHashMap<>();

    public AlertService(AlertRepository alertRepository, SiteRepository siteRepository) {
        this.alertRepository = alertRepository;
        this.siteRepository  = siteRepository;
    }

    /**
     * Populate the site name cache on startup.
     * Runs after dependency injection is complete — before any request arrives.
     */
    @PostConstruct
    public void loadSiteCache() {
        siteRepository.findAll().forEach(s ->
                siteNameCache.put(s.getSiteId(), s.getSiteName())
        );
    }

    public List<AlertDto> getAllAlerts() {
        // Uses the in-memory cache — no extra DB round-trip per request.
        return alertRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public void acknowledgeAlert(String alertId) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new NoSuchElementException("Alert not found: " + alertId));

        // Read the authenticated user's email from the JWT (set by JwtAuthFilter).
        // Falls back to "system" if somehow called without an authenticated context.
        String acknowledgedBy = Optional.ofNullable(
                SecurityContextHolder.getContext().getAuthentication()
        ).map(auth -> auth.getName()).orElse("system");

        alert.setStatus("acknowledged");
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy(acknowledgedBy);
        alertRepository.save(alert);
    }

    private AlertDto toDto(AlertEntity entity) {
        List<String> recordIds = entity.getRecordIds() != null && !entity.getRecordIds().isBlank()
                ? Arrays.asList(entity.getRecordIds().split(","))
                : List.of();

        return AlertDto.builder()
                .id(entity.getId())
                .siteId(entity.getSiteId())
                .siteName(siteNameCache.getOrDefault(entity.getSiteId(), "Unknown"))
                .severity(entity.getSeverity())
                .status(entity.getStatus())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .rule(entity.getRule())
                .recordIds(recordIds)
                .createdAt(formatTimestamp(entity.getCreatedAt()))
                .acknowledgedAt(entity.getAcknowledgedAt() != null
                        ? formatTimestamp(entity.getAcknowledgedAt()) : null)
                .acknowledgedBy(entity.getAcknowledgedBy())
                .narrative(entity.getNarrative())
                .narrativeUpdatedAt(entity.getNarrativeUpdatedAt() != null
                        ? formatTimestamp(entity.getNarrativeUpdatedAt()) : null)
                .build();
    }

    private String formatTimestamp(LocalDateTime dt) {
        return dt != null ? dt.format(ISO_FORMATTER) : null;
    }
}
