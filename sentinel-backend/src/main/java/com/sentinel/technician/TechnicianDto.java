package com.sentinel.technician;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TechnicianDto {
    private Long id;
    private Long appUserId;
    private String name;
    private String email;
    private String stationHomeId;
    private List<String> qualifications;
}
