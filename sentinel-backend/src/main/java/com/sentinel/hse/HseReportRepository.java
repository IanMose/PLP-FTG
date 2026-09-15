package com.sentinel.hse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HseReportRepository extends JpaRepository<HseReportEntity, String> {

    List<HseReportEntity> findAllByOrderByGeneratedAtDesc();

    List<HseReportEntity> findByStatusOrderByGeneratedAtDesc(String status);

    List<HseReportEntity> findBySiteIdOrderByGeneratedAtDesc(String siteId);

    Optional<HseReportEntity> findFirstBySourceEventIdOrderByGeneratedAtDesc(String sourceEventId);

    /** Reports pending ESG promotion — approved but not yet extracted. */
    @Query("SELECT r FROM HseReportEntity r WHERE r.status = 'APPROVED' AND r.esgPromoted = false")
    List<HseReportEntity> findApprovedNotPromoted();

    long countByStatus(String status);
}
