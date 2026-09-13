package com.sentinel.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ModelFeedbackRepository extends JpaRepository<ModelFeedbackEntity, String> {
    List<ModelFeedbackEntity> findAllByOrderByCreatedAtDesc();
    Optional<ModelFeedbackEntity> findByPredictionIdAndSource(Long predictionId, String source);
}
