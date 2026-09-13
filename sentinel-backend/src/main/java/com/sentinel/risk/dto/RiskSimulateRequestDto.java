package com.sentinel.risk.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * Request body for POST /api/sites/{siteId}/simulate.
 *
 * All fields are nullable — null means "use the site's live value".
 * critHighPercentOverride is 0-100 (percentage), not a raw count.
 * rejectionRateOverride is 0.0-1.0 (fraction), not a percentage.
 */
@Data
public class RiskSimulateRequestDto {

    @Min(0) @Max(200)
    private Integer incidentCountOverride;

    @Min(0) @Max(100)
    private Integer critHighPercentOverride;

    @Min(0) @Max(365)
    private Integer daysSinceAuditOverride;

    @DecimalMin("0.0") @DecimalMax("1.0")
    private Double rejectionRateOverride;

    @Min(0) @Max(20)
    private Integer pressureSpikesOverride;
}
