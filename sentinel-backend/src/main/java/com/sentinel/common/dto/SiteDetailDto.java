package com.sentinel.common.dto;

import com.sentinel.common.dto.AlertDto;
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
    /** Active alerts for this site — used to surface the narrative at the top of the site detail page. */
    private List<AlertDto> activeAlerts;
}
