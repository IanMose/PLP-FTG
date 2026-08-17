package com.sentinel.prediction;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private final PredictionRepository predictionRepository;

    /**
     * Returns the latest prediction for each site as a list of DTOs.
     * Returns an empty list (not an error) if the model has not been trained yet.
     */
    public List<PredictionDto> getLatestPredictions() {
        return predictionRepository.findLatestPerSite().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Returns the latest prediction for a single site, or an empty Optional
     * if no prediction exists yet for this site.
     */
    public Optional<PredictionDto> getLatestForSite(String siteId) {
        return predictionRepository.findLatestBySiteId(siteId.toLowerCase()).map(this::toDto);
    }

    /**
     * Returns the latest probability per site as a simple siteId → probability map.
     * Used internally by RiskService to enrich SiteRiskSummaryDto.
     */
    public Map<String, Double> getProbabilityBySite() {
        return predictionRepository.findLatestPerSite().stream()
                .collect(Collectors.toMap(
                        PredictionEntity::getSiteId,
                        PredictionEntity::getProbability
                ));
    }

    private PredictionDto toDto(PredictionEntity e) {
        return PredictionDto.builder()
                .siteId(e.getSiteId())
                .asOfDate(e.getAsOfDate() != null ? e.getAsOfDate().toString() : null)
                .probability(e.getProbability())
                .riskBand(PredictionDto.toBand(e.getProbability()))
                .modelVersion(e.getModelVersion())
                .topFeatures(e.getTopFeatures())
                .build();
    }
}
