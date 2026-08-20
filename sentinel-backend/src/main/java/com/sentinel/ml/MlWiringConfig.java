package com.sentinel.ml;

import com.sentinel.capa.CapaService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;

/**
 * Breaks the circular dependency between CapaService and ModelFeedbackService
 * by injecting ModelFeedbackService into CapaService after both beans are constructed.
 */
@Configuration
@RequiredArgsConstructor
public class MlWiringConfig {

    private final CapaService capaService;
    private final ModelFeedbackService modelFeedbackService;

    @PostConstruct
    public void wire() {
        capaService.setModelFeedbackService(modelFeedbackService);
    }
}
