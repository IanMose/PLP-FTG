package com.sentinel.technician;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/technicians")
@RequiredArgsConstructor
public class TechnicianController {

    private final TechnicianService service;

    @GetMapping
    public ResponseEntity<List<TechnicianDto>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/eligible")
    public ResponseEntity<List<TechnicianDto>> listEligible(
            @RequestParam String qualification) {
        return ResponseEntity.ok(service.listEligible(qualification));
    }
}
