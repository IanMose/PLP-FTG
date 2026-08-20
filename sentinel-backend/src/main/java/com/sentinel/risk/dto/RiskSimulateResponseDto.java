package com.sentinel.risk.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response for POST /api/sites/{siteId}/simulate.
 *
 * Component contributions are weighted points (e.g., incidentFrequencyContrib
 * is up to 30.0 because its weight is 0.30 and the sub-score ceiling is 100).
 * All 5 contribs sum to simulatedScore (within rounding).
 */
@Data
@Builder
public class RiskSimulateResponseDto {
    private int currentScore;
    private String currentBand;
    private int simulatedScore;
    private String simulatedBand;
    private int scoreDelta;                     // simulatedScore - currentScore

    // Per-factor weighted contributions (max values: 30, 30, 20, 10, 10)
    private double incidentFrequencyContrib;
    private double severityMixContrib;
    private double auditRecencyContrib;
    private double rejectionRateContrib;
    private double pressureSpikesContrib;

    // Live baseline values (useful for slider reset)
    private int liveDaysSinceAudit;
    private int liveIncidentCount;
    private int liveCritHighPercent;
    private double liveRejectionRate;
    private int livePressureSpikes;
}
