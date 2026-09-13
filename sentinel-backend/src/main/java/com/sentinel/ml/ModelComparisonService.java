package com.sentinel.ml;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Builds the champion-vs-challenger comparison payload used by the Compare page.
 *
 * Feature importance diff (per V2 §7.5):
 *   - Both models store a JSON blob in model_registry.feature_importance
 *   - Shape: { "featureName": weight_float, ... }
 *   - Diff = challenger_weight − champion_weight (null → 0 for absent features)
 *   - Returns a unified list sorted by abs(challenger_weight) desc
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ModelComparisonService {

    private final ModelRegistryRepository registryRepo;
    private final ObjectMapper objectMapper;

    /**
     * Returns a full comparison payload for the two models.
     * Either parameter can be null — the service will find the latest champion/challenger.
     */
    public Map<String, Object> compare(String championId, String challengerId) {
        Map<String, Object> result = new LinkedHashMap<>();

        ModelRegistryEntity champion = championId != null
                ? registryRepo.findById(championId).orElse(null)
                : registryRepo.findFirstByStatusOrderByTrainedAtDesc("champion").orElse(null);

        ModelRegistryEntity challenger = challengerId != null
                ? registryRepo.findById(challengerId).orElse(null)
                : registryRepo.findFirstByStatusOrderByTrainedAtDesc("challenger").orElse(null);

        if (champion != null) result.put("champion", toModelMap(champion));
        if (challenger != null) result.put("challenger", toModelMap(challenger));

        if (champion != null && challenger != null) {
            result.put("featureImportanceDiff", buildFeatureDiff(champion, challenger));
            result.put("metricDiff", buildMetricDiff(champion, challenger));
        }

        return result;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private Map<String, Object> toModelMap(ModelRegistryEntity m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("version", m.getVersion());
        map.put("algorithm", m.getAlgorithm());
        map.put("status", m.getStatus());
        map.put("trainedAt", m.getTrainedAt());
        map.put("precisionScore", m.getPrecisionScore());
        map.put("recallScore", m.getRecallScore());
        map.put("f1Score", m.getF1Score());
        map.put("featureImportance", parseFeatureImportance(m.getFeatureImportance()));
        return map;
    }

    /**
     * Builds the unified feature importance diff list.
     * Each entry: { feature, championWeight, challengerWeight, delta }
     */
    private List<Map<String, Object>> buildFeatureDiff(
            ModelRegistryEntity champion, ModelRegistryEntity challenger) {

        Map<String, Double> champFI   = parseFeatureImportance(champion.getFeatureImportance());
        Map<String, Double> chalFI    = parseFeatureImportance(challenger.getFeatureImportance());

        // Union all feature keys
        Set<String> allFeatures = new LinkedHashSet<>();
        allFeatures.addAll(champFI.keySet());
        allFeatures.addAll(chalFI.keySet());

        List<Map<String, Object>> diff = new ArrayList<>();
        for (String feature : allFeatures) {
            double champWeight = champFI.getOrDefault(feature, 0.0);
            double chalWeight  = chalFI.getOrDefault(feature, 0.0);
            double delta       = chalWeight - champWeight;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("feature", feature);
            entry.put("championWeight",   champWeight);
            entry.put("challengerWeight", chalWeight);
            entry.put("delta", Math.round(delta * 1000.0) / 1000.0);
            entry.put("isNew", champFI.get(feature) == null);
            diff.add(entry);
        }

        // Sort by abs(challengerWeight) descending — most impactful features first
        diff.sort((a, b) -> Double.compare(
                Math.abs((Double) b.get("challengerWeight")),
                Math.abs((Double) a.get("challengerWeight"))));

        return diff;
    }

    /** Side-by-side metric delta for the comparison table */
    private Map<String, Object> buildMetricDiff(
            ModelRegistryEntity champion, ModelRegistryEntity challenger) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (champion.getPrecisionScore() != null && challenger.getPrecisionScore() != null) {
            m.put("precisionDelta", challenger.getPrecisionScore()
                    .subtract(champion.getPrecisionScore()));
        }
        if (champion.getRecallScore() != null && challenger.getRecallScore() != null) {
            m.put("recallDelta", challenger.getRecallScore()
                    .subtract(champion.getRecallScore()));
        }
        if (champion.getF1Score() != null && challenger.getF1Score() != null) {
            m.put("f1Delta", challenger.getF1Score()
                    .subtract(champion.getF1Score()));
        }
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Double> parseFeatureImportance(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            Map<String, Object> raw = objectMapper.readValue(json, new TypeReference<>() {});
            Map<String, Double> result = new LinkedHashMap<>();
            raw.forEach((k, v) -> {
                if (v instanceof Number n) result.put(k, n.doubleValue());
            });
            return result;
        } catch (Exception ex) {
            log.warn("ModelComparisonService: could not parse feature_importance JSON: {}", ex.getMessage());
            return new LinkedHashMap<>();
        }
    }
}
