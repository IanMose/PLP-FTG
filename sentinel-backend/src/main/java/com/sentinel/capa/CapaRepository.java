package com.sentinel.capa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface CapaRepository extends JpaRepository<CapaEntity, String> {
    List<CapaEntity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    List<CapaEntity> findAllByOrderByCreatedAtDesc();
    List<CapaEntity> findByStatusOrderByCreatedAtDesc(String status);

    List<CapaEntity> findByStatusInAndDueDateBefore(List<String> statuses, java.time.LocalDate date);

    List<CapaEntity> findByEscalatedAtIsNotNullOrderByEscalatedAtDesc();

    // Use a native query for date arithmetic — avoids HQL dialect issues
    @org.springframework.data.jpa.repository.Query(
        value = "SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/86400) FROM capa WHERE status = 'closed'",
        nativeQuery = true)
    Double avgClosureDays();

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT COUNT(*) FROM capa WHERE status = 'closed' AND closed_at <= due_date::timestamp",
        nativeQuery = true)
    Long countClosedBeforeDue();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(c) FROM CapaEntity c WHERE c.status = 'closed'")
    Long countClosed();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(c) FROM CapaEntity c WHERE c.status NOT IN ('closed','verified') AND c.dueDate < :today")
    Long countOverdue(@Param("today") LocalDate today);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(c) FROM CapaEntity c WHERE c.createdAt >= :since")
    long countCreatedSince(@Param("since") java.time.LocalDateTime since);
}
