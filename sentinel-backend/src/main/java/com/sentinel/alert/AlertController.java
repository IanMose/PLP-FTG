package com.sentinel.alert;

import com.sentinel.common.dto.AlertDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable String id) {
        alertService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }
}
