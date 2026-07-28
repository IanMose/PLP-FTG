package com.sentinel.compliance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ComplianceScoreRepository extends JpaRepository<ComplianceScoreEntity, Long> {

    /** Latest score per indicator for a specific site within a period */
    @Query("""
           SELECT s FROM ComplianceScoreEntity s
           WHERE s.siteId = :siteId
             AND s.periodStart >= :from
             AND s.periodEnd   <= :to
           ORDER BY s.calculatedAt DESC
           """)
    List<ComplianceScoreEntity> findBySiteAndPeriod(
            @Param("siteId") String siteId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** All scores for a given indicator across all sites within a period */
    @Query("""
           SELECT s FROM ComplianceScoreEntity s
           WHERE s.indicatorId = :indicatorId
             AND s.periodStart >= :from
             AND s.periodEnd   <= :to
           ORDER BY s.siteId, s.calculatedAt DESC
           """)
    List<ComplianceScoreEntity> findByIndicatorAndPeriod(
            @Param("indicatorId") String indicatorId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Most recent score for a site + indicator combination */
    @Query("""
           SELECT s FROM ComplianceScoreEntity s
           WHERE s.siteId = :siteId AND s.indicatorId = :indicatorId
           ORDER BY s.calculatedAt DESC
           """)
    List<ComplianceScoreEntity> findLatestBySiteAndIndicatorList(
            @Param("siteId") String siteId,
            @Param("indicatorId") String indicatorId);
}
