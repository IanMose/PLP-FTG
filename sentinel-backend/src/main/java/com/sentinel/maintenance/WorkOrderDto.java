package com.sentinel.maintenance;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Value
@Builder
public class WorkOrderDto {
    String id;
    String siteId;
    String capaId;
    String title;
    String description;
    Long assignedTechnicianId;
    String status;
    String priority;
    LocalDate dueDate;
    LocalDateTime completedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    static WorkOrderDto from(WorkOrderEntity e) {
        return WorkOrderDto.builder()
                .id(e.getId())
                .siteId(e.getSiteId())
                .capaId(e.getCapaId())
                .title(e.getTitle())
                .description(e.getDescription())
                .assignedTechnicianId(e.getAssignedTechnicianId())
                .status(e.getStatus())
                .priority(e.getPriority())
                .dueDate(e.getDueDate())
                .completedAt(e.getCompletedAt())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
