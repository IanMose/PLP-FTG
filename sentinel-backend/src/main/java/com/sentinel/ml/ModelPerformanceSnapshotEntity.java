package com.sentinel.ml;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "model_performance_snapshot")
@Getter
@Setter
public class ModelPerformanceSnapshotEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "model_registry_id", nullable = false, length = 36)
    private String modelRegistryId;

    /**
     * 'baseline' — first 30 feedback rows after promotion (this is "normal" for this champion)
     * 'recent'   — most recent 30 feedback rows (rolling)
     */
    @Column(name = "window_type", nullable = false, length = 20)
    private String windowType;

    @Column(name = "accuracy", nullable = false, precision = 6, scale = 4)
    private BigDecimal accuracy;

    @Column(name = "precision_score", precision = 6, scale = 4)
    private BigDecimal precisionScore;

    @Column(name = "recall_score", precision = 6, scale = 4)
    private BigDecimal recallScore;

    @Column(name = "f1_score", precision = 6, scale = 4)
    private BigDecimal f1Score;

    @Column(name = "sample_size", nullable = false)
    private Integer sampleSize;

    @Column(name = "computed_at", nullable = false)
    private LocalDateTime computedAt;
}
