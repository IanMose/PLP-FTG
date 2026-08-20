package com.sentinel.ml;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_run")
@Getter @Setter @NoArgsConstructor
public class TrainingRunEntity {
    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "model_registry_id", nullable = false)
    private String modelRegistryId;

    @Column(name = "triggered_by", nullable = false)
    private String triggeredBy;

    @Column(name = "rows_used", nullable = false)
    private int rowsUsed = 0;

    @Column(name = "feedback_rows_used", nullable = false)
    private int feedbackRowsUsed = 0;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
