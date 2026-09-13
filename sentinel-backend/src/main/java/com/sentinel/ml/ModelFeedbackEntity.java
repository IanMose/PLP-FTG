package com.sentinel.ml;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "model_feedback")
@Getter @Setter @NoArgsConstructor
public class ModelFeedbackEntity {
    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "prediction_id")
    private Long predictionId;

    @Column(name = "site_id", nullable = false)
    private String siteId;

    @Column(name = "source", nullable = false)
    private String source;

    @Column(name = "rating", nullable = false)
    private String rating;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
