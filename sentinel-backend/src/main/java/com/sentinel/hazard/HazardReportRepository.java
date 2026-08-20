package com.sentinel.hazard;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HazardReportRepository extends JpaRepository<HazardReportEntity, String> {
    List<HazardReportEntity> findBySiteIdOrderByCreatedAtDesc(String siteId);
    List<HazardReportEntity> findByReporterIdOrderByCreatedAtDesc(Long reporterId);
    List<HazardReportEntity> findAllByOrderByCreatedAtDesc();
    List<HazardReportEntity> findByStatusOrderByCreatedAtDesc(String status);
    @Query("SELECT COUNT(h) FROM HazardReportEntity h WHERE h.createdAt >= :since")
    long countCreatedSince(@org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);
}
