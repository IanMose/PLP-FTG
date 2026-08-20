package com.sentinel.hazard;

import lombok.Data;

@Data
public class RiskAssessmentRequest {
    private Integer likelihoodRating;
    private Integer severityRating;
    private String mitigationNote;
}
