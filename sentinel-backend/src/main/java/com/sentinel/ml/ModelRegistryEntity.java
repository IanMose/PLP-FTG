package com.sentinel.ml;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "model_registry")
@Getter @Setter @NoArgsConstructor
public class ModelRegistryEntity {
    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "version", nullable = false)
    private String version;

    @Column(name = "algorithm", nullable = false)
    private String algorithm;

    @Column(name = "trained_at", nullable = false)
    private LocalDateTime trainedAt = LocalDateTime.now();

    @Column(name = "precision_score", precision = 5, scale = 4)
    private BigDecimal precisionScore;

    @Column(name = "recall_score", precision = 5, scale = 4)
    private BigDecimal recallScore;

    @Column(name = "f1_score", precision = 5, scale = 4)
    private BigDecimal f1Score;

    @Column(name = "status", nullable = false)
    private String status = "challenger";

    @Column(name = "artifact_path", columnDefinition = "TEXT", nullable = false)
    private String artifactPath;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * V21: JSON blob of feature importance weights.
     * Shape: { "featureName": weight_float, ... }
     * Stored as TEXT — parsed by ModelComparisonService for the explainability diff view.
     */
    @Column(name = "feature_importance", columnDefinition = "TEXT")
    private String featureImportance;
}
