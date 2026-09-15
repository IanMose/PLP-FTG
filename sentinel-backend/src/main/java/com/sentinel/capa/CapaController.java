package com.sentinel.capa;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.sentinel.user.AppUserRepository;

import java.util.List;

@RestController
@RequestMapping("/api/capas")
@RequiredArgsConstructor
public class CapaController {

    private final CapaService service;
    private final AiCapaService aiCapaService;
    private final AppUserRepository userRepo;

    @PostMapping
    @PreAuthorize("hasAnyRole('HSE_OFFICER', 'HSE_MANAGER', 'AUDITOR', 'ADMIN')")
    public ResponseEntity<CapaDto> create(@RequestBody CreateCapaRequest req) {
        return ResponseEntity.ok(service.createCapa(req));
    }

    /**
     * POST /api/capas/ai-draft
     *
     * Returns an AI-generated CAPA draft (description, rootCause, suggestedActions)
     * WITHOUT saving anything. The frontend pre-fills the create form with this data.
     *
     * Query params (at least one required):
     *   alertId  — generate from an existing alert
     *   eventId  — generate from an existing event
     *
     * Body (optional, used when no alertId/eventId):
     *   { "siteId": "site-003", "description": "...", "severity": "High" }
     */
    @PostMapping("/ai-draft")
    public ResponseEntity<AiCapaService.AiCapaDraft> aiDraft(
            @RequestParam(required = false) String alertId,
            @RequestParam(required = false) String eventId,
            @RequestBody(required = false) AiDraftRequest body) {

        AiCapaService.AiCapaDraft draft;

        if (alertId != null && !alertId.isBlank()) {
            draft = aiCapaService.draftFromAlert(alertId);
        } else if (eventId != null && !eventId.isBlank()) {
            draft = aiCapaService.draftFromEvent(eventId);
        } else if (body != null) {
            draft = aiCapaService.draftFromContext(
                body.siteId(),
                body.description(),
                body.severity() != null ? body.severity() : "High"
            );
        } else {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(draft);
    }

    record AiDraftRequest(String siteId, String description, String severity) {}

    @GetMapping
    public ResponseEntity<List<CapaDto>> list(Authentication auth) {
        String role = extractRole(auth);
        if ("FIELD_TECHNICIAN".equals(role)) {
            Long userId = resolveUserId(auth);
            return ResponseEntity.ok(service.listByOwner(userId));
        }
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CapaDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/escalated")
    public ResponseEntity<List<CapaDto>> listEscalated() {
        return ResponseEntity.ok(service.listEscalated());
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('HSE_OFFICER', 'HSE_MANAGER', 'ADMIN')")
    public ResponseEntity<CapaDto> updateStatus(
            @PathVariable String id,
            @RequestBody UpdateCapaStatusRequest req,
            Authentication auth) {
        Long actorId = resolveUserId(auth);
        return ResponseEntity.ok(service.updateStatus(id, req.getStatus(), req.getEvidenceUrl(), actorId));
    }

    private Long resolveUserId(Authentication auth) {
        if (auth == null) return 1L;
        return userRepo.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getId()).orElse(1L);
    }

    private String extractRole(Authentication auth) {
        if (auth == null || auth.getAuthorities().isEmpty()) return "";
        String authority = auth.getAuthorities().iterator().next().getAuthority();
        return authority.startsWith("ROLE_") ? authority.substring(5) : authority;
    }
}
