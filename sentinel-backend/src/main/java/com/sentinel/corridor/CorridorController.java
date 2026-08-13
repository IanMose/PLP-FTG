package com.sentinel.corridor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST API for corridor heatmap data.
 *
 * CORS: inherits the existing sentinel.cors.allowed-origins config — no changes needed.
 * Auth: requires JWT, same as all other /api/** endpoints.
 */
@RestController
@RequestMapping("/api/corridor")
@RequiredArgsConstructor
@Tag(name = "Corridor", description = "Mombasa-Nairobi pipeline corridor risk heatmap")
public class CorridorController {

    private final CorridorHeatmapService corridorHeatmapService;
    private final AssetRepository assetRepository;

    /**
     * GET /api/corridor/risk-heatmap
     * Returns one HeatPoint per corridor asset — lat, lon, weight (0–1), band.
     */
    @Operation(summary = "Risk-weighted points for the corridor heatmap")
    @GetMapping("/risk-heatmap")
    public List<HeatPoint> riskHeatmap() {
        return corridorHeatmapService.getRiskHeatmap();
    }

    /**
     * GET /api/corridor/assets
     * Returns static asset metadata (coordinates, segment, sensor suite).
     * Useful for populating the asset list panel alongside the map.
     */
    @Operation(summary = "All corridor assets (static metadata)")
    @GetMapping("/assets")
    public List<Asset> assets() {
        return assetRepository.findAll();
    }
}
