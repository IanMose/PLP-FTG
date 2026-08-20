package com.sentinel.maintenance;

import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateWorkOrderRequest {
    private String siteId;       // required
    private String capaId;       // optional — links back to source CAPA
    private String title;        // required
    private String description;
    private Long assignedTechnicianId;
    private String priority = "medium"; // low | medium | high | critical
    private LocalDate dueDate;
}
