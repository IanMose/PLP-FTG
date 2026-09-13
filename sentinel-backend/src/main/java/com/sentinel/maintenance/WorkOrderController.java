package com.sentinel.maintenance;

import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final AppUserRepository userRepo;

    /**
     * GET /api/work-orders
     * Optional filters: ?siteId=, ?capaId=, ?status=, ?technicianId=
     */
    @GetMapping
    public ResponseEntity<List<WorkOrderDto>> list(
            @RequestParam(required = false) String siteId,
            @RequestParam(required = false) String capaId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long technicianId) {

        if (siteId != null)        return ResponseEntity.ok(workOrderService.listBySite(siteId));
        if (capaId != null)        return ResponseEntity.ok(workOrderService.listByCapa(capaId));
        if (status != null)        return ResponseEntity.ok(workOrderService.listByStatus(status));
        if (technicianId != null)  return ResponseEntity.ok(workOrderService.listByTechnician(technicianId));
        return ResponseEntity.ok(workOrderService.listAll());
    }

    /** GET /api/work-orders/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<WorkOrderDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(workOrderService.getById(id));
    }

    /**
     * POST /api/work-orders
     * Requires: ADMIN, HSE_MANAGER, AUDITOR, STATION_MANAGER, or FIELD_TECHNICIAN
     */
    @PostMapping
    public ResponseEntity<WorkOrderDto> create(
            @RequestBody CreateWorkOrderRequest req,
            Authentication auth) {
        Long creatorId = resolveUserId(auth);
        return ResponseEntity.ok(workOrderService.create(req, creatorId));
    }

    /**
     * PATCH /api/work-orders/{id}/status
     * Body: { "status": "in_progress" }
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<WorkOrderDto> updateStatus(
            @PathVariable String id,
            @RequestBody UpdateWorkOrderStatusRequest req,
            Authentication auth) {
        Long actorId = resolveUserId(auth);
        return ResponseEntity.ok(workOrderService.updateStatus(id, req.getStatus(), actorId));
    }

    private Long resolveUserId(Authentication auth) {
        if (auth == null) return null;
        return userRepo.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getId()).orElse(null);
    }
}
