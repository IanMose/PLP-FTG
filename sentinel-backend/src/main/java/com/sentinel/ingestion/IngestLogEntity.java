package com.sentinel.ingestion;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "ingest_log")
@Getter
@Setter
@NoArgsConstructor
public class IngestLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, unique = true)
    private String batchId;

    @Column(name = "source_filename", nullable = false)
    private String sourceFilename;

    @Column(name = "row_count", nullable = false)
    private Integer rowCount;

    @Column(name = "sha256_checksum", nullable = false)
    private String sha256Checksum;

    @Column(name = "ingestion_timestamp", nullable = false)
    private LocalDateTime ingestionTimestamp;

    @Column(name = "trusted_count")
    private Integer trustedCount;

    @Column(name = "corrected_count")
    private Integer correctedCount;

    @Column(name = "review_count")
    private Integer reviewCount;

    @Column(name = "rejected_count")
    private Integer rejectedCount;
}
