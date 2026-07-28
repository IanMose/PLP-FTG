package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

/** One compliance violation record. */
@Data
@Builder
public class ComplianceViolationDto {

    private Long id;
    private String ruleId;
    private String ruleName;
    private String indicatorId;
    private String domainId;
    private String siteId;
    private String siteName;
    private String assetReference;
    private String severity;
    private String violationDate;
    private String description;
    private String recommendedAction;
    private String status;
    private String closedDate;
    private String createdAt;
}
