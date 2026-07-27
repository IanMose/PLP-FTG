package com.sentinel.telemetry;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "fact_telemetry")
@Getter
@Setter
@NoArgsConstructor
public class TelemetryEntity {

    @Id
    @Column(name = "reading_id")
    private String readingId;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "site", nullable = false)
    private String site;

    @Column(name = "pipeline_section")
    private String pipelineSection;

    @Column(name = "pressure_psi")
    private Double pressurePsi;

    @Column(name = "flow_rate_bph")
    private Double flowRateBph;

    @Column(name = "temperature_celsius")
    private Double temperatureCelsius;

    @Column(name = "valve_status")
    private String valveStatus;

    @Column(name = "sensor_id")
    private String sensorId;
}
