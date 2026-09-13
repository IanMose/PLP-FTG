package com.sentinel.maintenance;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_order")
@Getter
@Setter
public class WorkOrderEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "site_id", nullable = false, length = 50)
    private String siteId;

    /** Optional — set when work order is raised from a CAPA */
    @Column(name = "capa_id", length = 36)
    private String capaId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "assigned_technician_id")
    private Long assignedTechnicianId;

    /**
     * State machine: open → in_progress → completed → verified
     */
    @Column(nullable = false, length = 50)
    private String status = "open";

    /**
     * Priority: low | medium | high | critical
     */
    @Column(nullable = false, length = 20)
    private String priority = "medium";

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
