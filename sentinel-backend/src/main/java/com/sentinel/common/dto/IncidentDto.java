package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IncidentDto {
    private String incidentId;
    private String siteId;
    private Double latitude;
    private Double longitude;
    private String incidentDate;
    private String severity;
    private String description;
    private int complianceScore;
    private String decision;
    private String decisionReason;
    private String closedDate;
}
