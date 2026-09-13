package com.sentinel.capa;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.sentinel.user.AppUserRepository;

import java.util.List;

@RestController
@RequestMapping("/api/capas")
@RequiredArgsConstructor
public class CapaController {

    private final CapaService service;
    private final AppUserRepository userRepo;

    @PostMapping
    public ResponseEntity<CapaDto> create(@RequestBody CreateCapaRequest req) {
        return ResponseEntity.ok(service.createCapa(req));
    }

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
