package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

/** Lightweight per-site compliance card for the heatmap and network summary. */
@Data
@Builder
public class SiteComplianceCardDto {

    private String siteId;
    private String siteName;
    private String region;
    private String criticality;
    private double overallScore;
    private String overallRag;
    private double safetyScore;
    private String safetyRag;
    private double environmentalScore;
    private String environmentalRag;
    private double assetIntegrityScore;
    private String assetIntegrityRag;
    private double regulatoryScore;
    private String regulatoryRag;
    private int openViolations;
}
