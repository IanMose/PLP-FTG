package com.sentinel.corridor;

/**
 * Response DTO for a single corridor heatmap point.
 *
 * weight is normalized 0.0–1.0; band is the human-readable severity tier.
 * This is a flat record — no GeoJSON wrapper, no spatial types.
 */
public record HeatPoint(
        String assetId,
        double lat,
        double lon,
        double weight,
        String band          // "low" | "medium" | "high" | "critical"
) {}
