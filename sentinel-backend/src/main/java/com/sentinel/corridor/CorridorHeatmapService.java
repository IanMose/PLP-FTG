package com.sentinel.corridor;

import com.sentinel.risk.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Computes a normalized risk weight (0.0–1.0) for every corridor asset.
 *
 * Weight formula — three named components, each 0.0–1.0:
 *
 *   1. floodZoneScore  (weight 0.40)
 *      high_flood → 1.0 | moderate_flood → 0.55 | low → 0.15 | unknown → 0.20
 *
 *   2. statusScore     (weight 0.40)
 *      Latest fact_environmental.status for this asset:
 *      critical → 1.0 | warning → 0.70 | advisory → 0.40 | normal → 0.10
 *
 *   3. siteRiskScore   (weight 0.20)
 *      If the asset has a nearest_site_code that maps to an existing site,
 *      reuse RiskService.getSiteRiskScore() — normalised from 0-100 to 0-1.
 *      If there is no linked site (most corridor assets) this component is 0.
 *
 * Performance:
 *   - Previously fired one SELECT per asset for the latest environmental status
 *     (~160 queries per heatmap request). Now resolved with a single bulk query
 *     (findLatestPerAsset) that returns one row per asset in one round trip.
 *   - siteScores are pre-fetched once from RiskService and looked up in-memory.
 */
@Service
@RequiredArgsConstructor
public class CorridorHeatmapService {

    private final AssetRepository                assetRepository;
    private final EnvironmentalReadingRepository readingRepository;
    private final RiskService                    riskService;

    public List<HeatPoint> getRiskHeatmap() {
        // 1 query — site risk scores (fires 4 DB queries inside computeRiskSummary)
        Map<String, Double> siteScores = riskService.computeRiskSummary().stream()
                .collect(Collectors.toMap(
                        s -> s.getSiteId(),
                        s -> s.getRiskScore() / 100.0
                ));

        // 1 query — latest environmental status for ALL assets at once.
        // Replaces the previous per-asset findLatestByAssetId() loop (~160 queries).
        Map<String, Double> statusScores = readingRepository.findLatestPerAsset().stream()
                .collect(Collectors.toMap(
                        EnvironmentalReading::getAssetId,
                        r -> statusToScore(r.getStatus()),
                        // If two readings share the exact same max timestamp, keep the higher score
                        Math::max
                ));

        // 1 query — all assets
        return assetRepository.findAll().stream()
                .map(asset -> toHeatPoint(asset, siteScores, statusScores))
                .toList();
    }

    private HeatPoint toHeatPoint(Asset asset,
                                  Map<String, Double> siteScores,
                                  Map<String, Double> statusScores) {
        double weight = computeWeight(asset, siteScores, statusScores);
        return new HeatPoint(
                asset.getAssetId(),
                asset.getLatitude(),
                asset.getLongitude(),
                weight,
                bandFor(weight)
        );
    }

    double computeWeight(Asset asset,
                         Map<String, Double> siteScores,
                         Map<String, Double> statusScores) {
        double floodZoneScore = floodZoneScore(asset.getFloodLandslideRiskZone());
        double statusScore    = statusScores.getOrDefault(asset.getAssetId(), 0.10); // no data → normal
        double siteRiskScore  = siteRiskScore(asset.getNearestSiteCode(), siteScores);

        double raw = (floodZoneScore * 0.40)
                   + (statusScore    * 0.40)
                   + (siteRiskScore  * 0.20);

        return Math.min(1.0, Math.max(0.0, raw));
    }

    /** flood/landslide zone → 0.0–1.0 */
    private double floodZoneScore(String zone) {
        if (zone == null) return 0.20;
        return switch (zone.toLowerCase()) {
            case "high_flood"     -> 1.0;
            case "moderate_flood" -> 0.55;
            case "low"            -> 0.15;
            default               -> 0.20;
        };
    }

    /** Environmental reading status string → 0.0–1.0 score */
    private double statusToScore(String status) {
        if (status == null) return 0.10;
        return switch (status.toLowerCase()) {
            case "critical" -> 1.0;
            case "warning"  -> 0.70;
            case "advisory" -> 0.40;
            default         -> 0.10; // "normal"
        };
    }

    /** Site-level risk normalised to 0.0–1.0; 0 if no linked site. */
    private double siteRiskScore(String nearestSiteCode, Map<String, Double> siteScores) {
        if (nearestSiteCode == null || nearestSiteCode.isBlank()) return 0.0;
        return siteScores.getOrDefault(nearestSiteCode, 0.0);
    }

    private String bandFor(double weight) {
        if (weight >= 0.75) return "critical";
        if (weight >= 0.55) return "high";
        if (weight >= 0.30) return "medium";
        return "low";
    }
}
