package com.sentinel.ml;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModelPerformanceSnapshotRepository extends JpaRepository<ModelPerformanceSnapshotEntity, String> {

    List<ModelPerformanceSnapshotEntity> findByModelRegistryIdOrderByComputedAtDesc(String modelRegistryId);

    Optional<ModelPerformanceSnapshotEntity> findFirstByModelRegistryIdAndWindowTypeOrderByComputedAtDesc(
            String modelRegistryId, String windowType);
}
