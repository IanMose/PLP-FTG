package com.sentinel.corridor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * JPA entity for fact_environmental — corridor telemetry readings keyed to an
 * asset (not a site). Includes rainfall_mm which the main fact_telemetry
 * table does not carry.
 */
@Entity
@Table(name = "fact_environmental")
@Getter
@Setter
@NoArgsConstructor
public class EnvironmentalReading {

    @Id
    @Column(name = "reading_id", length = 40)
    private String readingId;

    @Column(name = "asset_id")
    private String assetId;

    @Column(name = "reading_timestamp", nullable = false)
    private LocalDateTime readingTimestamp;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "pressure_psi")
    private Double pressurePsi;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "flow_rate_bph")
    private Double flowRateBph;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "temperature_celsius")
    private Double temperatureCelsius;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "rainfall_mm")
    private Double rainfallMm;

    /** "normal" | "advisory" | "warning" | "critical" */
    @Column(name = "status")
    private String status;
}
