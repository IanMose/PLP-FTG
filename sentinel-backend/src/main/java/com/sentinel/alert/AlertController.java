package com.sentinel.alert;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sentinel.common.dto.AlertDto;

/**
 * REST API for the alert feed.
 * Each alert links back to the specific record(s) and rule that produced it,
 * carrying forward Stage 1's "traceable reason" principle.
 */
@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    /** GET /api/alerts — paginated, filterable alert feed */
    @GetMapping
    public ResponseEntity<List<AlertDto>> getAlerts() {
        return ResponseEntity.ok(alertService.getAllAlerts());
    }

    /** POST /api/alerts/{id}/ack — acknowledge an alert (audit-logged) */
    @PostMapping("/{id}/ack")
    @PreAuthorize("hasAnyRole('HSE_OFFICER', 'HSE_MANAGER', 'STATION_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable String id) {
        alertService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }
}
