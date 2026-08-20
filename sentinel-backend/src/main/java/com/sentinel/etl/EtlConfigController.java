package com.sentinel.etl;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;


@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class EtlConfigController {

    private final EtlReloadService etlReloadService;

    @GetMapping("/etl")
    public Map<String, Object> etlConfig() {
        return Map.of(
            "frontendRefreshMs", etlReloadService.getFrontendRefreshMs(),
            "pollIntervalMs",    etlReloadService.getPollIntervalMs(),
            "rowsPerCycle",      etlReloadService.getRowsPerCycle()
        );
    }

    /**
     * Manual trigger — forces an immediate ETL reload without waiting for the
     * scheduled poll interval. Useful during development and live demos.
     * POST /api/config/etl/trigger
     */
    @PostMapping("/etl/trigger")
    public Map<String, Object> triggerReload() {
        etlReloadService.reload();
        return Map.of("status", "triggered");
    }
}
