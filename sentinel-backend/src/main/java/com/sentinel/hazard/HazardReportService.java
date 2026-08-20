package com.sentinel.hazard;

import com.sentinel.alert.AlertRulesEngine;
import com.sentinel.site.SiteRepository;
import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HazardReportService {

    private final HazardReportRepository hazardRepo;
    private final SiteRepository siteRepo;
    private final AppUserRepository userRepo;
    private final AlertRulesEngine alertRulesEngine;

    @Transactional
    public HazardReportDto createReport(CreateHazardReportRequest req, Long reporterId) {
        HazardReportEntity entity = new HazardReportEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setSiteId(req.getSiteId());
        entity.setAssetId(req.getAssetId());
        entity.setCategory(req.getCategory());
        entity.setDescription(req.getDescription());
        entity.setSeverityEstimate(req.getSeverityEstimate());
        entity.setReporterId(reporterId);
        entity.setPhotoUrl(req.getPhotoUrl());
        entity.setStatus("open");
        entity.setReportType(req.getReportType() != null ? req.getReportType() : "hazard");
        entity.setCreatedAt(LocalDateTime.now());
        hazardRepo.save(entity);
        return toDto(entity);
    }

    @Transactional
    public HazardReportDto assessRisk(String id, RiskAssessmentRequest req, Long assessorId) {
        HazardReportEntity entity = hazardRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Hazard report not found: " + id));

        int likelihood = req.getLikelihoodRating();
        int severity   = req.getSeverityRating();
        if (likelihood < 1 || likelihood > 5 || severity < 1 || severity > 5) {
            throw new IllegalArgumentException("Likelihood and severity must be between 1 and 5");
        }

        int riskRating = likelihood * severity;
        entity.setLikelihoodRating(likelihood);
        entity.setSeverityRating(severity);
        entity.setRiskRating(riskRating);
        entity.setMitigationNote(req.getMitigationNote());
        entity.setAssessedBy(assessorId);
        entity.setAssessedAt(LocalDateTime.now());
        entity.setStatus("risk_assessed");

        // Fire alert if rating crosses High (≥10) or Critical (≥15) threshold
        if (riskRating >= 10) {
            String alertSeverity = riskRating >= 15 ? "Critical" : "High";
            try {
                String alertId = alertRulesEngine.createHazardAlert(entity, alertSeverity);
                if (alertId != null) {
                    entity.setLinkedAlertId(alertId);
                    entity.setStatus("linked_to_alert");
                }
            } catch (Exception ex) {
                log.warn("HazardReportService: alert creation failed for hazard {}: {}", id, ex.getMessage());
            }
        }

        hazardRepo.save(entity);
        return toDto(entity);
    }

    public List<HazardReportDto> listAll() {
        return hazardRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public List<HazardReportDto> listBySite(String siteId) {
        return hazardRepo.findBySiteIdOrderByCreatedAtDesc(siteId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public List<HazardReportDto> listByReporter(Long reporterId) {
        return hazardRepo.findByReporterIdOrderByCreatedAtDesc(reporterId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public HazardReportDto getById(String id) {
        return hazardRepo.findById(id).map(this::toDto)
                .orElseThrow(() -> new NoSuchElementException("Hazard report not found: " + id));
    }

    @Transactional
    public void closeReport(String id) {
        HazardReportEntity entity = hazardRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Hazard report not found: " + id));
        entity.setStatus("closed");
        hazardRepo.save(entity);
    }

    private HazardReportDto toDto(HazardReportEntity e) {
        String reporterEmail = userRepo.findById(e.getReporterId())
                .map(u -> u.getEmail()).orElse("unknown");
        String assessedByEmail = e.getAssessedBy() != null
                ? userRepo.findById(e.getAssessedBy()).map(u -> u.getEmail()).orElse(null)
                : null;
        String siteName = siteRepo.findById(e.getSiteId())
                .map(s -> s.getSiteName()).orElse(e.getSiteId());

        return HazardReportDto.builder()
                .id(e.getId()).siteId(e.getSiteId()).siteName(siteName)
                .assetId(e.getAssetId()).category(e.getCategory())
                .description(e.getDescription()).severityEstimate(e.getSeverityEstimate())
                .reporterId(e.getReporterId()).reporterEmail(reporterEmail)
                .photoUrl(e.getPhotoUrl()).likelihoodRating(e.getLikelihoodRating())
                .severityRating(e.getSeverityRating()).riskRating(e.getRiskRating())
                .mitigationNote(e.getMitigationNote()).assessedBy(e.getAssessedBy())
                .assessedByEmail(assessedByEmail).assessedAt(e.getAssessedAt())
                .linkedAlertId(e.getLinkedAlertId()).status(e.getStatus())
                .createdAt(e.getCreatedAt()).reportType(e.getReportType()).build();
    }
}
