package com.sentinel.quality;

import com.sentinel.common.dto.DataQualitySummaryDto;
import com.sentinel.common.dto.IngestBatchDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for data quality monitoring.
 * Surfaces the Stage 1 auditability story visually — trusted/corrected/review/rejected
 * split, CI gate result, and batch history with checksums.
 */
@RestController
@RequestMapping("/api/quality")
public class QualityController {

    private final QualityService qualityService;

    public QualityController(QualityService qualityService) {
        this.qualityService = qualityService;
    }

    /** GET /api/quality/summary — DQ panel: rates, gate status, latest batch */
    @GetMapping("/summary")
    public ResponseEntity<DataQualitySummaryDto> getSummary() {
        return ResponseEntity.ok(qualityService.getSummary());
    }

    /** GET /api/quality/batches — ingest history with checksums, row counts, batch_id */
    @GetMapping("/batches")
    public ResponseEntity<List<IngestBatchDto>> getBatches() {
        return ResponseEntity.ok(qualityService.getBatches());
    }
}
