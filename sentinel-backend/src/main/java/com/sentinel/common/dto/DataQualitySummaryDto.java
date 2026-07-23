package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DataQualitySummaryDto {
    private int trusted;
    private int corrected;
    private int review;
    private int rejected;
    private int total;
    private double passRate;
    private String gateStatus;
    private double threshold;
    private String lastBatchId;
    private String lastBatchDate;
}
