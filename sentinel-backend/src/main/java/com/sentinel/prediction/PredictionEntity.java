package com.sentinel.prediction;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity for the fact_predictions table.
 * Each row represents the model's latest incident probability score for one site.
 */
@Entity
@Table(name = "fact_predictions")
@Data
@NoArgsConstructor
public class PredictionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "as_of_date", nullable = false)
    private LocalDate asOfDate;

    /** Probability of a Critical incident in the next 7 days (0.0–1.0). */
    @Column(nullable = false, columnDefinition = "NUMERIC(7,4)")
    private Double probability;

    @Column(name = "model_version")
    private String modelVersion;

    /** JSON string: top-3 contributing features for this prediction. */
    @Column(name = "top_features", columnDefinition = "TEXT")
    private String topFeatures;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
