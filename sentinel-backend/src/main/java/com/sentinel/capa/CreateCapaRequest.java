package com.sentinel.capa;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateCapaRequest {
    private String sourceAlertId;
    private String sourceHazardId;
    private Long ownerId;
    private LocalDate dueDate;
    private String description;
}
