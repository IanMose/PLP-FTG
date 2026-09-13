package com.sentinel.site;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "dim_site")
@Getter
@Setter
@NoArgsConstructor
public class SiteEntity {

    @Id
    @Column(name = "site_id")
    private String siteId;

    @Column(name = "site_name", nullable = false)
    private String siteName;

    @Column(name = "location")
    private String location;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // KPC-specific columns added in V3 migration
    @Column(name = "station_type")
    private String stationType;

    @Column(name = "region")
    private String region;

    @Column(name = "criticality")
    private String criticality;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "is_active")
    private Boolean isActive;
}
