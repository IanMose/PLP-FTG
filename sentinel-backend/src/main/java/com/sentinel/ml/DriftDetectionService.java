package com.sentinel.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Daily scheduled job that computes baseline and recent performance snapshots
 * for the current champion model, enabling drift detection.
 *
 * Thresholds (per V2 architecture doc §7.3):
 *   - Minimum sample size before any calculation: 30 feedback rows
 *   - Baseline window: first 30 model_feedback rows after promotion
 *   - Recent window: most recent 30 model_feedback rows
 *   - Warning state: baseline − recent ≥ 5 percentage points
 *   - Critical state: drop > 10 points OR recent accuracy < 70%
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DriftDetectionService {

    private static final int WINDOW_SIZE = 30;
    private static final double WARNING_THRESHOLD  = 0.05; // 5pp drop
    private static final double CRITICAL_THRESHOLD = 0.10; // 10pp drop
    private static final double CRITICAL_ABSOLUTE  = 0.70; // 70% floor

    private final ModelRegistryRepository registryRepo;
    private final ModelFeedbackRepository feedbackRepo;
    private final ModelPerformanceSnapshotRepository snapshotRepo;

    /**
     * Runs daily at 03:00 server time.
     * Reads the current champion's feedback, computes accuracy for both windows,
     * and stores a new snapshot pair.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void computeDailySnapshot() {
        Optional<ModelRegistryEntity> championOpt =
                registryRepo.findFirstByStatusOrderByTrainedAtDesc("champion");
        if (championOpt.isEmpty()) {
            log.debug("DriftDetectionService: no champion model found, skipping");
            return;
        }
        ModelRegistryEntity champion = championOpt.get();
        List<ModelFeedbackEntity> allFeedback = feedbackRepo.findAllByOrderByCreatedAtDesc();

        if (allFeedback.size() < WINDOW_SIZE) {
            log.debug("DriftDetectionService: only {} feedback rows — need {} minimum, skipping",
                    allFeedback.size(), WINDOW_SIZE);
            return;
        }

        // Baseline = oldest WINDOW_SIZE rows (after promotion — approximated as last items)
        List<ModelFeedbackEntity> baseline = allFeedback.subList(
                Math.max(0, allFeedback.size() - WINDOW_SIZE), allFeedback.size());
        // Recent = most recent WINDOW_SIZE rows
        List<ModelFeedbackEntity> recent = allFeedback.subList(0, WINDOW_SIZE);

        BigDecimal baselineAcc = computeAccuracy(baseline);
        BigDecimal recentAcc   = computeAccuracy(recent);

        saveSnapshot(champion.getId(), "baseline", baselineAcc, baseline.size());
        saveSnapshot(champion.getId(), "recent",   recentAcc,   recent.size());

        double delta = baselineAcc.doubleValue() - recentAcc.doubleValue();
        String driftStatus = "normal";
        if (delta >= CRITICAL_THRESHOLD || recentAcc.doubleValue() < CRITICAL_ABSOLUTE) {
            driftStatus = "critical";
        } else if (delta >= WARNING_THRESHOLD) {
            driftStatus = "warning";
        }

        log.info("DriftDetectionService: champion={} baseline={} recent={} delta={} status={}",
                champion.getVersion(), baselineAcc, recentAcc,
                String.format("%.3f", delta), driftStatus);
    }

    /**
     * Returns the latest drift summary for the current champion.
     * Called by the ML Admin Drift page via GET /api/ml/drift.
     */
    public Map<String, Object> getLatestDriftSummary() {
        Map<String, Object> result = new LinkedHashMap<>();
        Optional<ModelRegistryEntity> championOpt =
                registryRepo.findFirstByStatusOrderByTrainedAtDesc("champion");

        if (championOpt.isEmpty()) {
            result.put("status", "no_champion");
            return result;
        }

        ModelRegistryEntity champion = championOpt.get();
        result.put("championId", champion.getId());
        result.put("championVersion", champion.getVersion());

        Optional<ModelPerformanceSnapshotEntity> baselineSnap =
                snapshotRepo.findFirstByModelRegistryIdAndWindowTypeOrderByComputedAtDesc(
                        champion.getId(), "baseline");
        Optional<ModelPerformanceSnapshotEntity> recentSnap =
                snapshotRepo.findFirstByModelRegistryIdAndWindowTypeOrderByComputedAtDesc(
                        champion.getId(), "recent");

        baselineSnap.ifPresent(s -> {
            result.put("baselineAccuracy", s.getAccuracy());
            result.put("baselineSampleSize", s.getSampleSize());
            result.put("baselineComputedAt", s.getComputedAt());
        });

        recentSnap.ifPresent(s -> {
            result.put("recentAccuracy", s.getAccuracy());
            result.put("recentSampleSize", s.getSampleSize());
            result.put("recentComputedAt", s.getComputedAt());
        });

        if (baselineSnap.isPresent() && recentSnap.isPresent()) {
            double baseline = baselineSnap.get().getAccuracy().doubleValue();
            double recent   = recentSnap.get().getAccuracy().doubleValue();
            double delta    = baseline - recent;
            result.put("deltaPercentagePoints", BigDecimal.valueOf(delta).setScale(4, RoundingMode.HALF_UP));

            String driftStatus = "normal";
            if (delta >= CRITICAL_THRESHOLD || recent < CRITICAL_ABSOLUTE) {
                driftStatus = "critical";
            } else if (delta >= WARNING_THRESHOLD) {
                driftStatus = "warning";
            }
            result.put("driftStatus", driftStatus);
        } else {
            result.put("driftStatus", "insufficient_data");
        }

        // Historical snapshots for trend chart (last 14 'recent' entries)
        List<ModelPerformanceSnapshotEntity> history =
                snapshotRepo.findByModelRegistryIdOrderByComputedAtDesc(champion.getId());
        List<Map<String, Object>> trend = history.stream()
                .filter(s -> "recent".equals(s.getWindowType()))
                .limit(14)
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("computedAt", s.getComputedAt());
                    m.put("accuracy", s.getAccuracy());
                    m.put("sampleSize", s.getSampleSize());
                    return m;
                })
                .toList();
        result.put("trend", trend);

        return result;
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Accuracy = (CORRECT ratings) / total.
     * 'correct' means rating is 'correct' or 'true_positive'.
     * 'incorrect' means 'incorrect', 'false_positive', or 'false_negative'.
     * Other ratings (e.g. 'uncertain') are excluded from the denominator.
     */
    private BigDecimal computeAccuracy(List<ModelFeedbackEntity> rows) {
        long correct = rows.stream()
                .filter(f -> "correct".equalsIgnoreCase(f.getRating())
                        || "true_positive".equalsIgnoreCase(f.getRating()))
                .count();
        long scored = rows.stream()
                .filter(f -> isScoreable(f.getRating()))
                .count();
        if (scored == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf((double) correct / scored)
                .setScale(4, RoundingMode.HALF_UP);
    }

    private boolean isScoreable(String rating) {
        if (rating == null) return false;
        return switch (rating.toLowerCase()) {
            case "correct", "true_positive", "incorrect",
                 "false_positive", "false_negative" -> true;
            default -> false;
        };
    }

    private void saveSnapshot(String modelId, String windowType,
                              BigDecimal accuracy, int sampleSize) {
        ModelPerformanceSnapshotEntity snap = new ModelPerformanceSnapshotEntity();
        snap.setId(UUID.randomUUID().toString());
        snap.setModelRegistryId(modelId);
        snap.setWindowType(windowType);
        snap.setAccuracy(accuracy);
        snap.setSampleSize(sampleSize);
        snap.setComputedAt(LocalDateTime.now());
        snapshotRepo.save(snap);
    }
}
