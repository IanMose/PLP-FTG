package com.sentinel.ml;

import com.sentinel.prediction.PredictionEntity;
import com.sentinel.prediction.PredictionRepository;
import com.sentinel.user.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
@Slf4j
public class MlAdminController {

    private final ModelRegistryRepository registryRepo;
    private final TrainingRunRepository runRepo;
    private final ModelFeedbackRepository feedbackRepo;
    private final PredictionRepository predictionRepo;
    private final AppUserRepository userRepo;
    private final RetrainingScheduleService scheduleService;
    private final DriftDetectionService driftService;
    private final ModelComparisonService comparisonService;

    @GetMapping("/champion-artifact-path")
    public ResponseEntity<Map<String, String>> getChampionPath() {
        return registryRepo.findFirstByStatusOrderByTrainedAtDesc("champion")
                .map(m -> ResponseEntity.ok(Map.of("artifactPath", m.getArtifactPath())))
                .orElse(ResponseEntity.ok(Map.of("artifactPath", "sentinel/models/logreg_v1.pkl")));
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        Map<String, Object> result = new LinkedHashMap<>();
        registryRepo.findFirstByStatusOrderByTrainedAtDesc("champion")
                .ifPresent(c -> result.put("champion", toRegistryMap(c)));
        registryRepo.findFirstByStatusOrderByTrainedAtDesc("challenger")
                .ifPresent(c -> result.put("challenger", toRegistryMap(c)));
        List<Map<String, Object>> history = registryRepo.findAllByOrderByTrainedAtDesc()
                .stream().limit(5).map(this::toRegistryMap).collect(Collectors.toList());
        result.put("history", history);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/model-registry")
    public ResponseEntity<List<Map<String, Object>>> getRegistry() {
        List<Map<String, Object>> list = registryRepo.findAllByOrderByTrainedAtDesc()
                .stream().map(this::toRegistryMap).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/training-runs")
    public ResponseEntity<List<Map<String, Object>>> getTrainingRuns() {
        List<Map<String, Object>> list = runRepo.findAllByOrderByStartedAtDesc()
                .stream().map(this::toRunMap).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/feedback")
    public ResponseEntity<List<Map<String, Object>>> getFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Map<String, Object>> all = feedbackRepo.findAllByOrderByCreatedAtDesc()
                .stream().skip((long) page * size).limit(size)
                .map(f -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", f.getId());
                    m.put("siteId", f.getSiteId());
                    m.put("source", f.getSource());
                    m.put("rating", f.getRating());
                    m.put("note", f.getNote());
                    m.put("createdAt", f.getCreatedAt());
                    return m;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(all);
    }

    @GetMapping("/predictions-for-review")
    public ResponseEntity<List<Map<String, Object>>> getPredictionsForReview() {
        List<PredictionEntity> preds = predictionRepo.findAll();
        // Sort by uncertainty (closest to 0.5 first)
        preds.sort(Comparator.comparingDouble(p ->
                Math.abs(p.getProbability().doubleValue() - 0.5)));
        List<Map<String, Object>> result = preds.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("predictionId", p.getId());
            m.put("siteId", p.getSiteId());
            m.put("probability", p.getProbability());
            m.put("asOfDate", p.getAsOfDate());
            double uncertainty = Math.abs(p.getProbability().doubleValue() - 0.5);
            m.put("confidenceBand", uncertainty < 0.1 ? "uncertain" : uncertainty < 0.2 ? "low" : "confident");
            // Check for existing human_review feedback
            feedbackRepo.findByPredictionIdAndSource(p.getId(), "human_review")
                    .ifPresent(fb -> m.put("existingRating", fb.getRating()));
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/feedback")
    public ResponseEntity<Map<String, String>> submitFeedback(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        ModelFeedbackEntity fb = new ModelFeedbackEntity();
        fb.setId(UUID.randomUUID().toString());
        fb.setSiteId((String) body.get("siteId"));
        fb.setSource("human_review");
        fb.setRating((String) body.get("rating"));
        fb.setNote((String) body.get("note"));
        if (body.get("predictionId") != null) {
            fb.setPredictionId(Long.parseLong(body.get("predictionId").toString()));
        }
        if (auth != null) {
            userRepo.findByEmailIgnoreCase(auth.getName()).ifPresent(u -> fb.setReviewerId(u.getId()));
        }
        fb.setCreatedAt(LocalDateTime.now());
        feedbackRepo.save(fb);
        return ResponseEntity.ok(Map.of("id", fb.getId(), "status", "saved"));
    }

    @PostMapping("/training-run")
    public ResponseEntity<Map<String, String>> saveTrainingRun(@RequestBody Map<String, Object> body) {
        // Create model_registry entry (challenger)
        ModelRegistryEntity model = new ModelRegistryEntity();
        model.setId(UUID.randomUUID().toString());
        model.setVersion((String) body.getOrDefault("version", "logreg_auto"));
        model.setAlgorithm((String) body.getOrDefault("algorithm", "logistic_regression"));
        model.setTrainedAt(LocalDateTime.now());
        if (body.get("precisionScore") != null)
            model.setPrecisionScore(new BigDecimal(body.get("precisionScore").toString()));
        if (body.get("recallScore") != null)
            model.setRecallScore(new BigDecimal(body.get("recallScore").toString()));
        if (body.get("f1Score") != null)
            model.setF1Score(new BigDecimal(body.get("f1Score").toString()));
        model.setStatus("challenger");
        model.setArtifactPath((String) body.getOrDefault("artifactPath", "sentinel/models/logreg_v1.pkl"));
        registryRepo.save(model);

        // Create training_run entry
        TrainingRunEntity run = new TrainingRunEntity();
        run.setId(UUID.randomUUID().toString());
        run.setModelRegistryId(model.getId());
        run.setTriggeredBy((String) body.getOrDefault("triggeredBy", "manual"));
        run.setRowsUsed(Integer.parseInt(body.getOrDefault("rowsUsed", 0).toString()));
        run.setFeedbackRowsUsed(Integer.parseInt(body.getOrDefault("feedbackRowsUsed", 0).toString()));
        run.setStartedAt(LocalDateTime.now());
        run.setCompletedAt(LocalDateTime.now());
        run.setNotes((String) body.get("notes"));
        runRepo.save(run);

        return ResponseEntity.ok(Map.of(
                "modelRegistryId", model.getId(),
                "trainingRunId", run.getId(),
                "status", "saved"));
    }

    @PatchMapping("/model-registry/{id}/promote")
    public ResponseEntity<Map<String, String>> promote(
            @PathVariable String id, Authentication auth) {
        ModelRegistryEntity challenger = registryRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Model not found: " + id));
        if (!"challenger".equals(challenger.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Model is not a challenger"));
        }
        // Archive current champion(s)
        registryRepo.findByStatusOrderByTrainedAtDesc("champion").forEach(m -> {
            m.setStatus("archived");
            registryRepo.save(m);
        });
        challenger.setStatus("champion");
        challenger.setApprovedAt(LocalDateTime.now());
        if (auth != null) {
            userRepo.findByEmailIgnoreCase(auth.getName())
                    .ifPresent(u -> challenger.setApprovedBy(u.getId()));
        }
        registryRepo.save(challenger);
        log.info("MlAdminController: promoted model {} to champion", id);
        return ResponseEntity.ok(Map.of("status", "promoted", "newChampion", id));
    }

    @PatchMapping("/model-registry/{id}/reject")
    public ResponseEntity<Map<String, String>> reject(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body) {
        ModelRegistryEntity model = registryRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Model not found: " + id));
        model.setStatus("rejected");
        if (body != null && body.get("notes") != null) {
            model.setNotes((String) body.get("notes"));
        }
        registryRepo.save(model);
        return ResponseEntity.ok(Map.of("status", "rejected"));
    }

    // ── V2: Retraining Schedule ───────────────────────────────────────────────

    /** POST /api/ml/retraining/schedule  { cadence: "weekly" } */
    @PostMapping("/retraining/schedule")
    public ResponseEntity<Map<String, Object>> enableSchedule(
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        String cadence = body != null ? (String) body.getOrDefault("cadence", "weekly") : "weekly";
        String actor   = auth != null ? auth.getName() : "unknown";
        return ResponseEntity.ok(scheduleService.enableSchedule(cadence, actor));
    }

    /** POST /api/ml/retraining/disable */
    @PostMapping("/retraining/disable")
    public ResponseEntity<Map<String, Object>> disableSchedule(Authentication auth) {
        String actor = auth != null ? auth.getName() : "unknown";
        return ResponseEntity.ok(scheduleService.disableSchedule(actor));
    }

    /** GET /api/ml/retraining/status */
    @GetMapping("/retraining/status")
    public ResponseEntity<Map<String, Object>> getScheduleStatus() {
        return ResponseEntity.ok(scheduleService.getStatus());
    }

    // ── V2: Drift Detection ───────────────────────────────────────────────────

    /** GET /api/ml/drift */
    @GetMapping("/drift")
    public ResponseEntity<Map<String, Object>> getDrift() {
        return ResponseEntity.ok(driftService.getLatestDriftSummary());
    }

    // ── V2: Champion vs Challenger comparison ─────────────────────────────────

    /**
     * GET /api/ml/models/compare?champion={id}&challenger={id}
     * Both params are optional — defaults to current champion and latest challenger.
     */
    @GetMapping("/models/compare")
    public ResponseEntity<Map<String, Object>> compare(
            @RequestParam(required = false) String champion,
            @RequestParam(required = false) String challenger) {
        return ResponseEntity.ok(comparisonService.compare(champion, challenger));
    }

    /**
     * PATCH /api/ml/model-registry/{id}/rollback
     * Promotes any archived model back to champion (same mechanism as promote,
     * but accepts 'archived' status too). Requires human confirmation — no auto-rollback.
     */
    @PatchMapping("/model-registry/{id}/rollback")
    public ResponseEntity<Map<String, String>> rollback(
            @PathVariable String id, Authentication auth) {
        ModelRegistryEntity target = registryRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Model not found: " + id));
        if (!"archived".equals(target.getStatus())) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Only archived models can be rolled back"));
        }
        // Archive current champion
        registryRepo.findByStatusOrderByTrainedAtDesc("champion").forEach(m -> {
            m.setStatus("archived");
            registryRepo.save(m);
        });
        target.setStatus("champion");
        target.setApprovedAt(java.time.LocalDateTime.now());
        if (auth != null) {
            userRepo.findByEmailIgnoreCase(auth.getName())
                    .ifPresent(u -> target.setApprovedBy(u.getId()));
        }
        registryRepo.save(target);
        log.info("MlAdminController: rolled back to model {} as champion", id);
        return ResponseEntity.ok(Map.of("status", "rolled_back", "newChampion", id));
    }

    private Map<String, Object> toRegistryMap(ModelRegistryEntity m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("version", m.getVersion());
        map.put("algorithm", m.getAlgorithm());
        map.put("trainedAt", m.getTrainedAt());
        map.put("precisionScore", m.getPrecisionScore());
        map.put("recallScore", m.getRecallScore());
        map.put("f1Score", m.getF1Score());
        map.put("status", m.getStatus());
        map.put("artifactPath", m.getArtifactPath());
        map.put("approvedAt", m.getApprovedAt());
        map.put("notes", m.getNotes());
        map.put("featureImportance", m.getFeatureImportance());
        return map;
    }

    private Map<String, Object> toRunMap(TrainingRunEntity r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("modelRegistryId", r.getModelRegistryId());
        map.put("triggeredBy", r.getTriggeredBy());
        map.put("rowsUsed", r.getRowsUsed());
        map.put("feedbackRowsUsed", r.getFeedbackRowsUsed());
        map.put("startedAt", r.getStartedAt());
        map.put("completedAt", r.getCompletedAt());
        map.put("notes", r.getNotes());
        return map;
    }
}
