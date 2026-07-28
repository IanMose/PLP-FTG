package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Network-wide compliance overview — one OCS gauge value per site,
 * plus network average. Used by the compliance dashboard KPI strip.
 */
@Data
@Builder
public class ComplianceNetworkSummaryDto {

    /** One entry per active KPC station */
    private List<SiteComplianceCardDto> sites;

    /** Network-wide weighted averages */
    private double networkOcs;
    private double networkSafetyScore;
    private double networkEnvironmentalScore;
    private double networkAssetIntegrityScore;
    private double networkRegulatoryScore;
    private String networkRag;

    private int totalOpenViolations;
    private int totalCriticalViolations;
    private String calculatedAt;
}
