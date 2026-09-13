package com.sentinel.capa;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CapaDto {
    private String id;
    private String sourceAlertId;
    private String sourceHazardId;
    private Long ownerId;
    private String ownerEmail;
    private String ownerName;
    private LocalDate dueDate;
    private String description;
    private String status;
    private String evidenceUrl;
    private Long verifiedBy;
    private String verifiedByEmail;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime escalatedAt;
    private Boolean requiresWorkOrder;
}
