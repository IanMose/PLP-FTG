package com.sentinel.alert;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<AlertEntity, String> {

    List<AlertEntity> findAllByOrderByCreatedAtDesc();

    List<AlertEntity> findBySiteIdOrderByCreatedAtDesc(String siteId);

    List<AlertEntity> findByStatusOrderByCreatedAtDesc(String status);

    /**
     * Deduplication check — used by AlertRulesEngine to avoid creating a
     * duplicate active alert for the same site + rule combination.
     */
    Optional<AlertEntity> findFirstBySiteIdAndRuleAndStatus(String siteId, String rule, String status);
}
