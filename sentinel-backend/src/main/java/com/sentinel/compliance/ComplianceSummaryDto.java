package com.sentinel.compliance;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Full compliance summary for one site — domain scores, indicator breakdowns,
 * OCS, and open violation count. Returned by GET /api/compliance/sites/{siteId}.
 */
@Data
@Builder
public class ComplianceSummaryDto {

    private String siteId;
    private String siteName;

    /** Overall Compliance Score (weighted aggregate of all domain scores) */
    private double overallScore;
    private String overallRag;    // GREEN / AMBER / RED

    /** One entry per active compliance domain */
    private List<DomainScoreDto> domains;

    /** Count of open violations across all domains for this site */
    private int openViolationCount;
    private int criticalViolationCount;

    private String periodStart;
    private String periodEnd;
    private String calculatedAt;
}
