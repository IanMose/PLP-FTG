package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/** Compliance score for one domain, with its child indicator scores. */
@Data
@Builder
public class DomainScoreDto {

    private String domainId;
    private String domainName;
    private double domainWeight;
    private double score;
    private String ragStatus;    // GREEN / AMBER / RED
    private int displayOrder;

    /** Child indicator scores for this domain */
    private List<IndicatorScoreDto> indicators;
}
