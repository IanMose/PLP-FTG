package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SiteRiskSummaryDto {
    private String siteId;
    private String siteName;
    private int riskScore;
    private String severityBand;
    private int incidentCount;
    private String lastAuditDate;
    private int daysSinceLastAudit;
    private double correctedRate;
    private double rejectedRate;
}
