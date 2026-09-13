package com.sentinel.ml;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "retraining_schedule")
@Getter
@Setter
public class RetrainingScheduleEntity {

    @Id
    @Column(length = 36)
    private String id;

    /**
     * State machine: disabled | scheduled | running | completed | failed | awaiting_review
     */
    @Column(nullable = false, length = 50)
    private String status = "disabled";

    /** Only 'weekly' in MVP V2 */
    @Column(nullable = false, length = 50)
    private String cadence = "weekly";

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt;

    @Column(name = "last_run_id", length = 36)
    private String lastRunId;

    @Column(name = "updated_by", length = 36)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
