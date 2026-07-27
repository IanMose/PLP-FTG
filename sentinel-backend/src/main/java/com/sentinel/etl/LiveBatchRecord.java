package com.sentinel.etl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * Maps the JSON produced by sentinel/src/run_pipeline.py → _write_json_export().
 * Structure:
 * {
 *   "batch_id":  "...",
 *   "timestamp": "2026-07-27T...",
 *   "incidents": [ {...}, ... ],
 *   "audits":    [ {...}, ... ],
 *   "telemetry": [ {...}, ... ],
 *   "summary":   { "trusted": 30, "corrected": 5, ... }
 * }
 */
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class LiveBatchRecord {

    private String batchId;
    private String timestamp;
    private List<Map<String, Object>> incidents;
    private List<Map<String, Object>> audits;
    private List<Map<String, Object>> telemetry;
    private Map<String, Integer> summary;
}
