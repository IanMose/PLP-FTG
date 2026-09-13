package com.sentinel.technician;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Table(name = "technician_qualification")
@Getter @Setter @NoArgsConstructor
public class TechnicianQualificationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "technician_id", nullable = false)
    private Long technicianId;

    @Column(name = "qualification_type", nullable = false)
    private String qualificationType;

    @Column(name = "certificate_url")
    private String certificateUrl;

    @Column(name = "expires_at")
    private LocalDate expiresAt;
}
