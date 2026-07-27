package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TelemetryReadingDto {
    private String readingId;
    private String timestamp;
    private String site;
    private String pipelineSection;
    private Double pressurePsi;
    private Double flowRateBph;
    private Double temperatureCelsius;
    private String valveStatus;
    private String sensorId;
}
