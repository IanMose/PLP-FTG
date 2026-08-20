package com.sentinel.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderRepository extends JpaRepository<WorkOrderEntity, String> {

    List<WorkOrderEntity> findAllByOrderByCreatedAtDesc();

    List<WorkOrderEntity> findBySiteIdOrderByCreatedAtDesc(String siteId);

    List<WorkOrderEntity> findByCapaIdOrderByCreatedAtDesc(String capaId);

    List<WorkOrderEntity> findByStatusOrderByCreatedAtDesc(String status);

    List<WorkOrderEntity> findByAssignedTechnicianIdOrderByCreatedAtDesc(Long technicianId);

    long countByStatus(String status);
}
