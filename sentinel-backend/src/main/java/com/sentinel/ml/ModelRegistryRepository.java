package com.sentinel.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ModelRegistryRepository extends JpaRepository<ModelRegistryEntity, String> {
    Optional<ModelRegistryEntity> findFirstByStatusOrderByTrainedAtDesc(String status);
    List<ModelRegistryEntity> findByStatusOrderByTrainedAtDesc(String status);
    List<ModelRegistryEntity> findAllByOrderByTrainedAtDesc();
}
