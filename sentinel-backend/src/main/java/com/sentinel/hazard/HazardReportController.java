package com.sentinel.hazard;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.sentinel.user.AppUserRepository;

import java.util.List;

@RestController
@RequestMapping("/api/hazard-reports")
@RequiredArgsConstructor
public class HazardReportController {

    private final HazardReportService service;
    private final AppUserRepository userRepo;

    @PostMapping
    public ResponseEntity<HazardReportDto> create(
            @RequestBody CreateHazardReportRequest req,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        return ResponseEntity.ok(service.createReport(req, userId));
    }

    @GetMapping
    public ResponseEntity<List<HazardReportDto>> list(
            @RequestParam(required = false) String siteId,
            Authentication auth) {
        String role = extractRole(auth);
        // Field Technician sees only their own reports
        if ("FIELD_TECHNICIAN".equals(role)) {
            Long userId = resolveUserId(auth);
            return ResponseEntity.ok(service.listByReporter(userId));
        }
        // Station Manager sees only their station
        if ("STATION_MANAGER".equals(role) && siteId != null) {
            return ResponseEntity.ok(service.listBySite(siteId));
        }
        if (siteId != null) {
            return ResponseEntity.ok(service.listBySite(siteId));
        }
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HazardReportDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PatchMapping("/{id}/risk-assessment")
    public ResponseEntity<HazardReportDto> assessRisk(
            @PathVariable String id,
            @RequestBody RiskAssessmentRequest req,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        return ResponseEntity.ok(service.assessRisk(id, req, userId));
    }

    private Long resolveUserId(Authentication auth) {
        if (auth == null) return 1L;
        String email = auth.getName();
        return userRepo.findByEmailIgnoreCase(email)
                .map(u -> u.getId()).orElse(1L);
    }

    private String extractRole(Authentication auth) {
        if (auth == null || auth.getAuthorities().isEmpty()) return "";
        String authority = auth.getAuthorities().iterator().next().getAuthority();
        return authority.startsWith("ROLE_") ? authority.substring(5) : authority;
    }
}
