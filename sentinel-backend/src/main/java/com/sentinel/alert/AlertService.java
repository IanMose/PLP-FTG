package com.sentinel.alert;

import com.sentinel.common.dto.AlertDto;
import com.sentinel.site.SiteEntity;
import com.sentinel.site.SiteRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Alert service — generates, persists, and queries alerts.
 * Each alert links back to the specific record(s) and rule that produced it,
 * carrying forward Stage 1's "traceable reason" principle.
 */
@Service
public class AlertService {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private final AlertRepository alertRepository;
    private final SiteRepository siteRepository;

    public AlertService(AlertRepository alertRepository, SiteRepository siteRepository) {
        this.alertRepository = alertRepository;
        this.siteRepository = siteRepository;
    }

    public List<AlertDto> getAllAlerts() {
        Map<String, String> siteNames = siteRepository.findAll().stream()
                .collect(Collectors.toMap(SiteEntity::getSiteId, SiteEntity::getSiteName));

        return alertRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(entity -> toDto(entity, siteNames))
                .collect(Collectors.toList());
    }

    public void acknowledgeAlert(String alertId) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new NoSuchElementException("Alert not found: " + alertId));

        alert.setStatus("acknowledged");
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy("api-user"); // Stub auth — real user from auth context in future
        alertRepository.save(alert);
    }

    private AlertDto toDto(AlertEntity entity, Map<String, String> siteNames) {
        List<String> recordIds = entity.getRecordIds() != null && !entity.getRecordIds().isBlank()
                ? Arrays.asList(entity.getRecordIds().split(","))
                : List.of();

        return AlertDto.builder()
                .id(entity.getId())
                .siteId(entity.getSiteId())
                .siteName(siteNames.getOrDefault(entity.getSiteId(), "Unknown"))
                .severity(entity.getSeverity())
                .status(entity.getStatus())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .rule(entity.getRule())
                .recordIds(recordIds)
                .createdAt(formatTimestamp(entity.getCreatedAt()))
                .acknowledgedAt(entity.getAcknowledgedAt() != null ? formatTimestamp(entity.getAcknowledgedAt()) : null)
                .acknowledgedBy(entity.getAcknowledgedBy())
                .build();
    }

    private String formatTimestamp(LocalDateTime dt) {
        return dt != null ? dt.format(ISO_FORMATTER) : null;
    }
}
