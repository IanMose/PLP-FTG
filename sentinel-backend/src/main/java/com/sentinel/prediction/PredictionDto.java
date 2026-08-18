package com.sentinel.prediction;

import lombok.Builder;
import lombok.Data;

/**
 * DTO returned by GET /api/sites/predictions.
 * Contains the model's latest probability score for one site.
 */
@Data
@Builder
public class PredictionDto {
    private String siteId;
    private String asOfDate;
    /** Probability of a Critical incident in the next 7 days (0.0–1.0). */
    private Double probability;
    /** Human-readable risk band: HIGH / MODERATE / LOW */
    private String riskBand;
    private String modelVersion;
    /** JSON string listing the top 3 contributing features. */
    private String topFeatures;

    public static String toBand(Double prob) {
        if (prob == null) return "UNKNOWN";
        if (prob >= 0.70) return "HIGH";
        if (prob >= 0.40) return "MODERATE";
        return "LOW";
    }
}
