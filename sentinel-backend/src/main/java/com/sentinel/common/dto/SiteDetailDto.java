package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SiteDetailDto {
    private String siteId;
    private String siteName;
    private String location;
    private Double latitude;
    private Double longitude;
    private int riskScore;
    private String severityBand;
    private int pressureSpikeCount;
    private int incidentCount;
    private int critHighCount;
    private int daysSinceAudit;
    private double rejectedRate;
    private List<IncidentDto> incidents;
    private List<AuditDto> audits;
    private List<TelemetryReadingDto> telemetryReadings;
}
