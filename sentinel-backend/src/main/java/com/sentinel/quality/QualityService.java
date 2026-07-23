package com.sentinel.quality;

import com.sentinel.common.dto.DataQualitySummaryDto;
import com.sentinel.common.dto.IngestBatchDto;
import com.sentinel.ingestion.IngestLogEntity;
import com.sentinel.ingestion.IngestLogRepository;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Data quality service.
 * Recomputes trusted/corrected/review/rejected rates from ingest_log.
 * Exposes DQ summary API matching the frontend's DataQualitySummary type.
 */
@Service
public class QualityService {

    private static final double GATE_THRESHOLD = 0.90;
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private final IngestLogRepository ingestLogRepository;

    public QualityService(IngestLogRepository ingestLogRepository) {
        this.ingestLogRepository = ingestLogRepository;
    }

    public DataQualitySummaryDto getSummary() {
        List<IngestLogEntity> batches = ingestLogRepository.findAllByOrderByIngestionTimestampDesc();

        int totalTrusted = 0, totalCorrected = 0, totalReview = 0, totalRejected = 0;

        for (IngestLogEntity batch : batches) {
            totalTrusted += batch.getTrustedCount() != null ? batch.getTrustedCount() : 0;
            totalCorrected += batch.getCorrectedCount() != null ? batch.getCorrectedCount() : 0;
            totalReview += batch.getReviewCount() != null ? batch.getReviewCount() : 0;
            totalRejected += batch.getRejectedCount() != null ? batch.getRejectedCount() : 0;
        }

        int total = totalTrusted + totalCorrected + totalReview + totalRejected;
        double passRate = total > 0 ? (double) (totalTrusted + totalCorrected) / total : 0.0;
        String gateStatus = passRate >= GATE_THRESHOLD ? "passed" : "failed";

        IngestLogEntity latestBatch = batches.isEmpty() ? null : batches.get(0);

        return DataQualitySummaryDto.builder()
                .trusted(totalTrusted)
                .corrected(totalCorrected)
                .review(totalReview)
                .rejected(totalRejected)
                .total(total)
                .passRate(Math.round(passRate * 10000.0) / 10000.0)
                .gateStatus(gateStatus)
                .threshold(GATE_THRESHOLD)
                .lastBatchId(latestBatch != null ? latestBatch.getBatchId() : null)
                .lastBatchDate(latestBatch != null ? latestBatch.getIngestionTimestamp().format(ISO_FORMATTER) : null)
                .build();
    }

    public List<IngestBatchDto> getBatches() {
        return ingestLogRepository.findAllByOrderByIngestionTimestampDesc().stream()
                .map(entity -> IngestBatchDto.builder()
                        .batchId(entity.getBatchId())
                        .sourceFilename(entity.getSourceFilename())
                        .rowCount(entity.getRowCount())
                        .sha256Checksum(entity.getSha256Checksum())
                        .ingestedAt(entity.getIngestionTimestamp().format(ISO_FORMATTER))
                        .trustedCount(entity.getTrustedCount() != null ? entity.getTrustedCount() : 0)
                        .correctedCount(entity.getCorrectedCount() != null ? entity.getCorrectedCount() : 0)
                        .reviewCount(entity.getReviewCount() != null ? entity.getReviewCount() : 0)
                        .rejectedCount(entity.getRejectedCount() != null ? entity.getRejectedCount() : 0)
                        .build()
                ).collect(Collectors.toList());
    }
}
