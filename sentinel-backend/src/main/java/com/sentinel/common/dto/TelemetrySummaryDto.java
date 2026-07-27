package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TelemetrySummaryDto {
    private int totalReadings;
    private int pressureSpikeCount;
    private int sensorDropoutCount;
    private double avgPressure;
    private double avgFlowRate;
    private double avgTemperature;
}
