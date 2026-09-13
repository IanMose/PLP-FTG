package com.sentinel.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TrainingRunRepository extends JpaRepository<TrainingRunEntity, String> {
    List<TrainingRunEntity> findAllByOrderByStartedAtDesc();
}
