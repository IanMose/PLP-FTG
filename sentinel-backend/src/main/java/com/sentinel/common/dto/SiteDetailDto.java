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
    private int riskScore;
    private String severityBand;
    private List<IncidentDto> incidents;
    private List<AuditDto> audits;
}
