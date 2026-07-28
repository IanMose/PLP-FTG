package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

/** Score for one compliance indicator at one site. */
@Data
@Builder
public class IndicatorScoreDto {

    private String indicatorId;
    private String indicatorName;
    private String domainId;
    private double indicatorWeight;
    private double score;
    private String ragStatus;
    private String indicatorType;  // LEADING / LAGGING / MIXED
    private Integer numerator;
    private Integer denominator;
    private double greenThreshold;
    private double amberThreshold;
}
