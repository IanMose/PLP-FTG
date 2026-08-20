package com.sentinel.capa;

import com.sentinel.alert.AlertRepository;
import com.sentinel.hazard.HazardReportRepository;
import com.sentinel.technician.TechnicianQualificationRepository;
import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CapaService {

    private final CapaRepository capaRepo;
    private final AlertRepository alertRepo;
    private final HazardReportRepository hazardRepo;
    private final TechnicianQualificationRepository qualificationRepo;
    private final AppUserRepository userRepo;

    // Injected lazily via setter to break circular dependency with ModelFeedbackService
    private com.sentinel.ml.ModelFeedbackService modelFeedbackService;

    public void setModelFeedbackService(com.sentinel.ml.ModelFeedbackService mfs) {
        this.modelFeedbackService = mfs;
    }

    @Transactional
    public CapaDto createCapa(CreateCapaRequest req) {
        // Qualification guard — if source alert has a required_qualification, check owner
        if (req.getSourceAlertId() != null) {
            alertRepo.findById(req.getSourceAlertId()).ifPresent(alert -> {
                String requiredQual = alert.getRequiredQualification();
                if (requiredQual != null && !requiredQual.isBlank()) {
                    boolean eligible = qualificationRepo.existsValidQualification(
                            req.getOwnerId(), requiredQual, LocalDate.now());
                    if (!eligible) {
                        throw new QualificationMismatchException(
                            "Technician does not hold a valid '" + requiredQual + "' qualification");
                    }
                }
            });
        }

        CapaEntity capa = new CapaEntity();
        capa.setId(UUID.randomUUID().toString());
        capa.setSourceAlertId(req.getSourceAlertId());
        capa.setSourceHazardId(req.getSourceHazardId());
        capa.setOwnerId(req.getOwnerId());
        capa.setDueDate(req.getDueDate());
        capa.setDescription(req.getDescription());
        capa.setStatus("open");
        capa.setCreatedAt(LocalDateTime.now());
        capaRepo.save(capa);
        return toDto(capa);
    }

    @Transactional
    public CapaDto updateStatus(String id, String newStatus, String evidenceUrl, Long actorId) {
        CapaEntity capa = capaRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("CAPA not found: " + id));

        // Validate allowed transitions
        Set<String> allowed = allowedTransitions(capa.getStatus());
        if (!allowed.contains(newStatus)) {
            throw new IllegalStateException(
                "Cannot transition from '" + capa.getStatus() + "' to '" + newStatus + "'");
        }

        capa.setStatus(newStatus);
        if (evidenceUrl != null && !evidenceUrl.isBlank()) {
            capa.setEvidenceUrl(evidenceUrl);
        }
        if ("verified".equals(newStatus)) {
            capa.setVerifiedBy(actorId);
        }
        if ("closed".equals(newStatus)) {
            capa.setClosedAt(LocalDateTime.now());
            // Write feedback row — hook point for ML HITL
            if (modelFeedbackService != null) {
                try {
                    modelFeedbackService.recordCapaOutcome(capa);
                } catch (Exception ex) {
                    log.warn("CapaService: feedback write failed for CAPA {}: {}", id, ex.getMessage());
                }
            }
            // Close linked hazard report if present
            if (capa.getSourceHazardId() != null) {
                hazardRepo.findById(capa.getSourceHazardId()).ifPresent(h -> {
                    h.setStatus("closed");
                    hazardRepo.save(h);
                });
            }
        }
        capaRepo.save(capa);
        return toDto(capa);
    }

    public List<CapaDto> listAll() {
        return capaRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public List<CapaDto> listByOwner(Long ownerId) {
        return capaRepo.findByOwnerIdOrderByCreatedAtDesc(ownerId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public CapaDto getById(String id) {
        return capaRepo.findById(id).map(this::toDto)
                .orElseThrow(() -> new NoSuchElementException("CAPA not found: " + id));
    }

    /**
     * Hourly escalation check.
     * Any CAPA whose due_date has passed and is still open/in_progress gets
     * escalated_at set (once only — won't overwrite an existing value).
     */
    @Scheduled(fixedDelay = 3_600_000, initialDelay = 60_000)
    @Transactional
    public void checkEscalations() {
        LocalDate today = LocalDate.now();
        List<CapaEntity> overdue = capaRepo.findByStatusInAndDueDateBefore(
                List.of("open", "in_progress"), today);
        int count = 0;
        for (CapaEntity capa : overdue) {
            if (capa.getEscalatedAt() == null) {
                capa.setEscalatedAt(LocalDateTime.now());
                capaRepo.save(capa);
                count++;
            }
        }
        if (count > 0) {
            log.info("CapaService: escalated {} overdue CAPAs", count);
        }
    }

    public List<CapaDto> listEscalated() {
        return capaRepo.findByEscalatedAtIsNotNullOrderByEscalatedAtDesc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private Set<String> allowedTransitions(String current) {
        return switch (current) {
            case "open"        -> Set.of("in_progress");
            case "in_progress" -> Set.of("completed", "open");
            case "completed"   -> Set.of("verified", "in_progress");
            case "verified"    -> Set.of("closed");
            default            -> Set.of();
        };
    }

    private CapaDto toDto(CapaEntity e) {
        String ownerEmail = userRepo.findById(e.getOwnerId())
                .map(u -> u.getEmail()).orElse("unknown");
        String ownerName = userRepo.findById(e.getOwnerId())
                .map(u -> u.getName()).orElse("Unknown");
        String verifiedByEmail = e.getVerifiedBy() != null
                ? userRepo.findById(e.getVerifiedBy()).map(u -> u.getEmail()).orElse(null)
                : null;
        return CapaDto.builder()
                .id(e.getId()).sourceAlertId(e.getSourceAlertId())
                .sourceHazardId(e.getSourceHazardId()).ownerId(e.getOwnerId())
                .ownerEmail(ownerEmail).ownerName(ownerName)
                .dueDate(e.getDueDate()).description(e.getDescription())
                .status(e.getStatus()).evidenceUrl(e.getEvidenceUrl())
                .verifiedBy(e.getVerifiedBy()).verifiedByEmail(verifiedByEmail)
                .closedAt(e.getClosedAt()).createdAt(e.getCreatedAt())
                .escalatedAt(e.getEscalatedAt())
                .requiresWorkOrder(e.getRequiresWorkOrder())
                .build();
    }
}
