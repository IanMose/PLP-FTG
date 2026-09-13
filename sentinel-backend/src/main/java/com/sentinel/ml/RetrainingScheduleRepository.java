package com.sentinel.ml;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RetrainingScheduleRepository extends JpaRepository<RetrainingScheduleEntity, String> {

    /** There is always exactly one row — the global schedule */
    Optional<RetrainingScheduleEntity> findFirstByOrderByUpdatedAtDesc();
}
