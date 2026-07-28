package com.sentinel.etl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;


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
    private List<Map<String, Object>> environmental;
    private Map<String, Integer> summary;
}
