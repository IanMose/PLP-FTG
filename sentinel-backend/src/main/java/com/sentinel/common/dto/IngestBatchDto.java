package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IngestBatchDto {
    private String batchId;
    private String sourceFilename;
    private int rowCount;
    private String sha256Checksum;
    private String ingestedAt;
    private int trustedCount;
    private int correctedCount;
    private int reviewCount;
    private int rejectedCount;
}
