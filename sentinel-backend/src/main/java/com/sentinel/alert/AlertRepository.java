package com.sentinel.alert;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<AlertEntity, String> {

    List<AlertEntity> findAllByOrderByCreatedAtDesc();

    List<AlertEntity> findBySiteIdOrderByCreatedAtDesc(String siteId);

    List<AlertEntity> findByStatusOrderByCreatedAtDesc(String status);
}
