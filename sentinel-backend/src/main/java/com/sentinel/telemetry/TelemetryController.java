package com.sentinel.telemetry;

import com.sentinel.common.dto.TelemetryReadingDto;
import com.sentinel.common.dto.TelemetrySummaryDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for pipeline telemetry data.
 * Surfaces the leading-indicator layer: pressure, flow, and temperature readings.
 */
@RestController
@RequestMapping("/api/telemetry")
public class TelemetryController {

    private final TelemetryService telemetryService;

    public TelemetryController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    /** GET /api/telemetry/summary — overview of telemetry health */
    @GetMapping("/summary")
    public ResponseEntity<TelemetrySummaryDto> getSummary() {
        return ResponseEntity.ok(telemetryService.getSummary());
    }

    /** GET /api/telemetry/site/{siteId} — latest readings for a specific site */
    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<TelemetryReadingDto>> getSiteReadings(@PathVariable String siteId) {
        return ResponseEntity.ok(telemetryService.getSiteReadings(siteId));
    }
}
