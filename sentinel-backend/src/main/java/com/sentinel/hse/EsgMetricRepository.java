package com.sentinel.hse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EsgMetricRepository extends JpaRepository<EsgMetricEntity, String> {

    List<EsgMetricEntity> findByEsgAreaOrderByPromotedAtDesc(String esgArea);

    List<EsgMetricEntity> findBySourceReportIdOrderByEsgArea(String sourceReportId);

    List<EsgMetricEntity> findByPeriodOrderByEsgAreaAscMetricNameAsc(String period);

    @Query("SELECT m FROM EsgMetricEntity m WHERE m.period = :period AND m.esgArea = :area ORDER BY m.metricName")
    List<EsgMetricEntity> findByPeriodAndArea(@Param("period") String period, @Param("area") String area);

    boolean existsBySourceReportId(String sourceReportId);

    long countByEsgArea(String esgArea);
}
