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

@Entity
@Table(name = "dim_asset")
@Getter
@Setter
@NoArgsConstructor
public class Asset {

    @Id
    @Column(name = "asset_id")
    private String assetId;

    @Column(name = "asset_type", nullable = false)
    private String assetType;

    @Column(name = "nearest_site_code")
    private String nearestSiteCode;

    @Column(name = "segment")
    private String segment;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "chainage_km_approx")
    private Double chainageKmApprox;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "latitude", nullable = false)
    private Double latitude;

    @JdbcTypeCode(SqlTypes.NUMERIC)
    @Column(name = "longitude", nullable = false)
    private Double longitude;

    /** e.g. "low" | "moderate_flood" | "high_flood" */
    @Column(name = "flood_landslide_risk_zone")
    private String floodLandslideRiskZone;

    @Column(name = "sensor_suite")
    private String sensorSuite;
}
