package com.sentinel.technician;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TechnicianQualificationRepository extends JpaRepository<TechnicianQualificationEntity, Long> {
    List<TechnicianQualificationEntity> findByTechnicianId(Long technicianId);

    @Query("SELECT COUNT(q) > 0 FROM TechnicianQualificationEntity q " +
           "JOIN TechnicianEntity t ON t.id = q.technicianId " +
           "WHERE t.appUserId = :userId AND q.qualificationType = :qualType " +
           "AND (q.expiresAt IS NULL OR q.expiresAt > :today)")
    boolean existsValidQualification(
            @Param("userId") Long userId,
            @Param("qualType") String qualificationType,
            @Param("today") LocalDate today);

    @Query("SELECT DISTINCT q.qualificationType FROM TechnicianQualificationEntity q WHERE q.technicianId = :techId")
    List<String> findQualificationTypesByTechnicianId(@Param("techId") Long technicianId);
}
