package com.sentinel.ml;

import com.sentinel.capa.CapaEntity;
import com.sentinel.alert.AlertRepository;
import com.sentinel.hazard.HazardReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModelFeedbackService {

    private final ModelFeedbackRepository feedbackRepo;
    private final AlertRepository alertRepo;
    private final HazardReportRepository hazardRepo;

    /**
     * Called by CapaService.close() when a CAPA reaches closed status.
     * Writes a capa_outcome feedback row — the automatic, high-quality label source.
     */
    @Transactional
    public void recordCapaOutcome(CapaEntity capa) {
        String siteId = deriveSiteId(capa);
        if (siteId == null) {
            log.debug("ModelFeedbackService: cannot derive siteId for CAPA {} — skipping", capa.getId());
            return;
        }

        ModelFeedbackEntity fb = new ModelFeedbackEntity();
        fb.setId(UUID.randomUUID().toString());
        fb.setSiteId(siteId);
        fb.setSource("capa_outcome");
        fb.setRating("accurate");
        fb.setNote("CAPA " + capa.getId() + " verified and closed at " + capa.getClosedAt());
        fb.setCreatedAt(LocalDateTime.now());
        feedbackRepo.save(fb);
        log.info("ModelFeedbackService: recorded capa_outcome for CAPA {} site={}", capa.getId(), siteId);
    }

    private String deriveSiteId(CapaEntity capa) {
        if (capa.getSourceAlertId() != null) {
            return alertRepo.findById(capa.getSourceAlertId())
                    .map(a -> a.getSiteId()).orElse(null);
        }
        if (capa.getSourceHazardId() != null) {
            return hazardRepo.findById(capa.getSourceHazardId())
                    .map(h -> h.getSiteId()).orElse(null);
        }
        return null;
    }
}
