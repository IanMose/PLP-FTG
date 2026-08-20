package com.sentinel.maintenance;

import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepo;
    private final AppUserRepository userRepo;

    @Transactional
    public WorkOrderDto create(CreateWorkOrderRequest req, Long creatorId) {
        WorkOrderEntity wo = new WorkOrderEntity();
        wo.setId(UUID.randomUUID().toString());
        wo.setSiteId(req.getSiteId());
        wo.setCapaId(req.getCapaId());
        wo.setTitle(req.getTitle());
        wo.setDescription(req.getDescription());
        wo.setAssignedTechnicianId(req.getAssignedTechnicianId());
        wo.setPriority(req.getPriority() != null ? req.getPriority() : "medium");
        wo.setDueDate(req.getDueDate());
        wo.setStatus("open");
        wo.setCreatedBy(creatorId);
        wo.setCreatedAt(LocalDateTime.now());
        wo.setUpdatedAt(LocalDateTime.now());
        workOrderRepo.save(wo);
        log.info("WorkOrderService: created work order {} for site {}", wo.getId(), wo.getSiteId());
        return WorkOrderDto.from(wo);
    }

    @Transactional
    public WorkOrderDto updateStatus(String id, String newStatus, Long actorId) {
        WorkOrderEntity wo = workOrderRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Work order not found: " + id));

        Set<String> allowed = allowedTransitions(wo.getStatus());
        if (!allowed.contains(newStatus)) {
            throw new IllegalStateException(
                "Cannot transition work order from '" + wo.getStatus() + "' to '" + newStatus + "'");
        }

        wo.setStatus(newStatus);
        wo.setUpdatedAt(LocalDateTime.now());

        if ("completed".equals(newStatus)) {
            wo.setCompletedAt(LocalDateTime.now());
        }
        if ("verified".equals(newStatus)) {
            wo.setVerifiedBy(actorId);
            wo.setVerifiedAt(LocalDateTime.now());
        }

        workOrderRepo.save(wo);
        return WorkOrderDto.from(wo);
    }

    public List<WorkOrderDto> listAll() {
        return workOrderRepo.findAllByOrderByCreatedAtDesc()
                .stream().map(WorkOrderDto::from).collect(Collectors.toList());
    }

    public List<WorkOrderDto> listBySite(String siteId) {
        return workOrderRepo.findBySiteIdOrderByCreatedAtDesc(siteId)
                .stream().map(WorkOrderDto::from).collect(Collectors.toList());
    }

    public List<WorkOrderDto> listByCapa(String capaId) {
        return workOrderRepo.findByCapaIdOrderByCreatedAtDesc(capaId)
                .stream().map(WorkOrderDto::from).collect(Collectors.toList());
    }

    public List<WorkOrderDto> listByStatus(String status) {
        return workOrderRepo.findByStatusOrderByCreatedAtDesc(status)
                .stream().map(WorkOrderDto::from).collect(Collectors.toList());
    }

    public List<WorkOrderDto> listByTechnician(Long technicianId) {
        return workOrderRepo.findByAssignedTechnicianIdOrderByCreatedAtDesc(technicianId)
                .stream().map(WorkOrderDto::from).collect(Collectors.toList());
    }

    public WorkOrderDto getById(String id) {
        return workOrderRepo.findById(id)
                .map(WorkOrderDto::from)
                .orElseThrow(() -> new NoSuchElementException("Work order not found: " + id));
    }

    /** open → in_progress → completed → verified */
    private Set<String> allowedTransitions(String current) {
        return switch (current) {
            case "open"        -> Set.of("in_progress");
            case "in_progress" -> Set.of("completed", "open");
            case "completed"   -> Set.of("verified", "in_progress");
            default            -> Set.of();
        };
    }
}
