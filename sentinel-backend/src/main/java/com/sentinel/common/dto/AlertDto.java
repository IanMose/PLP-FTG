package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AlertDto {
    private String id;
    private String siteId;
    private String siteName;
    private String severity;
    private String status;
    private String title;
    private String description;
    private String rule;
    private List<String> recordIds;
    private String createdAt;
    private String acknowledgedAt;
    private String acknowledgedBy;
}
