package com.sentinel.roi;

import com.sentinel.analytics.AnalyticsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/analytics/roi")
@RequiredArgsConstructor
@Slf4j
public class RoiController {

    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    private static final String DISCLAIMER =
        "All financial figures derive from explicit, user-visible assumptions. " +
        "This is not a guarantee of savings, a reconstruction of the 2015 incident, " +
        "or a legal finding. The KES 3.02B court award is a reference benchmark for " +
        "consequence scale only.";

    /** Returns the Thange reference case JSON + default assumptions table. */
    @GetMapping("/reference-cases")
    public ResponseEntity<String> getReferenceCase() {
        return analyticsService.getRoiReferenceCase();
    }

    /** Applies the ROI formula server-side against user-submitted assumptions. */
    @PostMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculate(@RequestBody Map<String, Object> body) {
        try {
            double interventionProbability = toDouble(body.getOrDefault("interventionProbability", 0.70));
            double incidentExposureKes     = toDouble(body.getOrDefault("incidentExposureKes", 150_000_000.0));
            int    nHighRiskAlerts         = toInt(body.getOrDefault("nHighRiskAlerts", 3));
            Object platformCostObj         = body.get("annualPlatformCostKes");

            // Read lead_time_days from pre-computed roi_simulation_result.json
            double leadTimeDays = 17.1; // default from control_chart_data.json
            try {
                ResponseEntity<String> simResult = analyticsService.getRoiSimulationResult();
                if (simResult.getStatusCode().is2xxSuccessful() && simResult.getBody() != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> sim = objectMapper.readValue(simResult.getBody(), Map.class);
                    if (sim.get("lead_time_days") instanceof Number n) {
                        leadTimeDays = n.doubleValue();
                    }
                }
            } catch (Exception ex) {
                log.debug("RoiController: could not read roi_simulation_result.json, using default: {}", ex.getMessage());
            }

            // Core formula
            double expectedAvoided = interventionProbability * incidentExposureKes * nHighRiskAlerts;

            Map<String, Object> breakdown = new LinkedHashMap<>();
            breakdown.put("interventionProbability", interventionProbability);
            breakdown.put("incidentExposureKes", incidentExposureKes);
            breakdown.put("nHighRiskAlerts", nHighRiskAlerts);
            breakdown.put("expectedAvoidedCostKes", expectedAvoided);

            Double netBenefit = null;
            Double roiPct = null;
            if (platformCostObj != null) {
                double platformCost = toDouble(platformCostObj);
                if (platformCost > 0) {
                    netBenefit = expectedAvoided - platformCost;
                    roiPct = netBenefit / platformCost * 100;
                    breakdown.put("annualPlatformCostKes", platformCost);
                    breakdown.put("netBenefitKes", netBenefit);
                    breakdown.put("roiPct", roiPct);
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("leadTimeDays", leadTimeDays);
            result.put("leadTimeSource", "EWMA simulation — synthetic Thange-shaped scenario");
            result.put("expectedAvoidedCostKes", expectedAvoided);
            result.put("netBenefitKes", netBenefit);
            result.put("roiPct", roiPct);
            result.put("breakdown", breakdown);
            result.put("disclaimer", DISCLAIMER);
            return ResponseEntity.ok(result);

        } catch (Exception ex) {
            log.error("RoiController: calculation error: {}", ex.getMessage(), ex);
            return ResponseEntity.internalServerError().body(Map.of("error", ex.getMessage()));
        }
    }

    private double toDouble(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        return Double.parseDouble(o.toString());
    }

    private int toInt(Object o) {
        if (o instanceof Number n) return n.intValue();
        return Integer.parseInt(o.toString());
    }
}
