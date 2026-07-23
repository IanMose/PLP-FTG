package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuditDto {
    private String auditId;
    private String siteId;
    private String inspectionDate;
    private String auditor;
    private String findings;
    private int complianceScore;
    private boolean followUpRequired;
}
