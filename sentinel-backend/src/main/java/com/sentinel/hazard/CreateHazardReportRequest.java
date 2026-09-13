package com.sentinel.hazard;

import lombok.Data;

@Data
public class CreateHazardReportRequest {
    private String siteId;
    private Long assetId;
    private String category;
    private String description;
    private String severityEstimate;
    private String photoUrl;
    /** 'hazard' (default) | 'near_miss' */
    private String reportType = "hazard";
}
