package com.sentinel.capa;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "capa")
@Getter @Setter @NoArgsConstructor
public class CapaEntity {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "source_alert_id")
    private String sourceAlertId;

    @Column(name = "source_hazard_id")
    private String sourceHazardId;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "status", nullable = false)
    private String status = "open";

    @Column(name = "evidence_url")
    private String evidenceUrl;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // V18 additions — additive, nullable/defaulted so existing rows are unaffected

    /** Set by the scheduled escalation check when due_date passes without closure */
    @Column(name = "escalated_at")
    private LocalDateTime escalatedAt;

    /** True when the technician marks this finding as needing a maintenance work order */
    @Column(name = "requires_work_order", nullable = false)
    private Boolean requiresWorkOrder = false;
}
