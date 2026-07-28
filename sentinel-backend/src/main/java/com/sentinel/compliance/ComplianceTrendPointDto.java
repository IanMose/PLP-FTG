package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Weekly trend data point for the compliance trend chart. */
@Data
@Builder
public class ComplianceTrendPointDto {
    private String weekStart;
    private Double ocsScore;
    private Double safetyScore;
    private Double environmentalScore;
    private Double assetIntegrityScore;
    private Double regulatoryScore;
}
