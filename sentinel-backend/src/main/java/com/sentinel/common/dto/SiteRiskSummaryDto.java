package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SiteRiskSummaryDto {
    private String siteId;
    private String siteName;
    private Double latitude;
    private Double longitude;
    private int riskScore;
    private String severityBand;
    private int incidentCount;
    private int pressureSpikeCount;
    private String lastAuditDate;
    private int daysSinceLastAudit;
    private double correctedRate;
    private double rejectedRate;
    /**
     * ML model: probability of a Critical incident in the next 7 days.
     * Null if the model has not been trained yet (no fact_predictions rows).
     */
    private Double incidentProbability7d;
    /** Risk band derived from model probability: HIGH / MODERATE / LOW / null */
    private String modelRiskBand;
}
