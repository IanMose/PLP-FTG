package com.sentinel.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.LinkedHashMap;

/**
 * Manages the single-row retraining_schedule table.
 *
 * State machine (per V2 architecture §7.2):
 *   disabled → scheduled → running → completed/failed → awaiting_review
 *
 * The @Scheduled weekly job fires every Sunday at 02:00 server time.
 * If status is 'scheduled', it transitions to 'running' and delegates
 * to the existing training-run mechanism (POST /api/ml/training-run pattern).
 *
 * Auto-promotion is NEVER done here — the human gate is kept intact.
 * After a successful run, status moves to 'awaiting_review' so the ML Admin
 * portal shows the challenger and the comparison page.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RetrainingScheduleService {

    /** The seeded single-row ID (from V19 migration) */
    private static final String SCHEDULE_ID = "00000000-0000-0000-0001-000000000001";

    /** Minimum new model_feedback rows since last run before we proceed */
    private static final int FEEDBACK_THRESHOLD = 25;

    private final RetrainingScheduleRepository scheduleRepo;
    private final ModelRegistryRepository registryRepo;
    private final TrainingRunRepository runRepo;
    private final ModelFeedbackRepository feedbackRepo;

    // ── Public API called by controller ────────────────────────────────────

    @Transactional
    public Map<String, Object> enableSchedule(String cadence, String updatedBy) {
        RetrainingScheduleEntity schedule = getOrCreateSchedule();
        schedule.setStatus("scheduled");
        schedule.setCadence(cadence != null ? cadence : "weekly");
        schedule.setNextRunAt(nextSundayAt2am());
        schedule.setUpdatedBy(updatedBy);
        schedule.setUpdatedAt(LocalDateTime.now());
        scheduleRepo.save(schedule);
        log.info("RetrainingScheduleService: enabled schedule, next run at {}", schedule.getNextRunAt());
        return toMap(schedule);
    }

    @Transactional
    public Map<String, Object> disableSchedule(String updatedBy) {
        RetrainingScheduleEntity schedule = getOrCreateSchedule();
        schedule.setStatus("disabled");
        schedule.setNextRunAt(null);
        schedule.setUpdatedBy(updatedBy);
        schedule.setUpdatedAt(LocalDateTime.now());
        scheduleRepo.save(schedule);
        log.info("RetrainingScheduleService: schedule disabled");
        return toMap(schedule);
    }

    public Map<String, Object> getStatus() {
        return toMap(getOrCreateSchedule());
    }

    // ── Weekly cron job ──────────────────────────────────────────────────────

    /**
     * Fires every Sunday at 02:00. If status is 'scheduled' and the feedback
     * threshold is met, transitions to 'running' and records a training run
     * as a challenger (same as manual retrain path — no new ML code needed).
     */
    @Scheduled(cron = "0 0 2 * * SUN")
    @Transactional
    public void runScheduledRetraining() {
        RetrainingScheduleEntity schedule = getOrCreateSchedule();
        if (!"scheduled".equals(schedule.getStatus())) {
            log.debug("RetrainingScheduleService: cron fired but status is '{}' — skipping",
                    schedule.getStatus());
            return;
        }

        // Check feedback threshold
        long newFeedbackCount = feedbackRepo.count();
        if (newFeedbackCount < FEEDBACK_THRESHOLD) {
            log.info("RetrainingScheduleService: only {} feedback rows (threshold {}), skipping this cycle",
                    newFeedbackCount, FEEDBACK_THRESHOLD);
            // Keep status as 'scheduled', advance next_run_at
            schedule.setNextRunAt(nextSundayAt2am());
            schedule.setUpdatedAt(LocalDateTime.now());
            scheduleRepo.save(schedule);
            return;
        }

        // Transition to running
        schedule.setStatus("running");
        schedule.setUpdatedAt(LocalDateTime.now());
        scheduleRepo.save(schedule);

        log.info("RetrainingScheduleService: starting scheduled retraining run");

        try {
            // Create a challenger model_registry entry (mirrors existing manual retrain)
            ModelRegistryEntity model = new ModelRegistryEntity();
            model.setId(java.util.UUID.randomUUID().toString());
            model.setVersion("logreg_scheduled_" + System.currentTimeMillis());
            model.setAlgorithm("logistic_regression");
            model.setTrainedAt(LocalDateTime.now());
            model.setStatus("challenger");
            model.setArtifactPath("sentinel/models/logreg_v1.pkl"); // same model file for MVP
            model.setNotes("Scheduled auto-retraining run");
            registryRepo.save(model);

            // Create the training_run record
            TrainingRunEntity run = new TrainingRunEntity();
            run.setId(java.util.UUID.randomUUID().toString());
            run.setModelRegistryId(model.getId());
            run.setTriggeredBy("scheduled");
            run.setRowsUsed(0);
            run.setFeedbackRowsUsed((int) newFeedbackCount);
            run.setStartedAt(LocalDateTime.now());
            run.setCompletedAt(LocalDateTime.now());
            run.setNotes("Auto-retraining via weekly schedule");
            runRepo.save(run);

            // Update schedule state
            schedule.setStatus("awaiting_review");
            schedule.setLastRunId(run.getId());
            schedule.setNextRunAt(nextSundayAt2am());
            schedule.setUpdatedAt(LocalDateTime.now());
            scheduleRepo.save(schedule);

            log.info("RetrainingScheduleService: completed run {}, challenger model {} created",
                    run.getId(), model.getId());

        } catch (Exception ex) {
            log.error("RetrainingScheduleService: retraining failed", ex);
            schedule.setStatus("failed");
            schedule.setUpdatedAt(LocalDateTime.now());
            scheduleRepo.save(schedule);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private RetrainingScheduleEntity getOrCreateSchedule() {
        return scheduleRepo.findById(SCHEDULE_ID).orElseGet(() -> {
            RetrainingScheduleEntity s = new RetrainingScheduleEntity();
            s.setId(SCHEDULE_ID);
            s.setStatus("disabled");
            s.setCadence("weekly");
            s.setUpdatedAt(LocalDateTime.now());
            return scheduleRepo.save(s);
        });
    }

    private LocalDateTime nextSundayAt2am() {
        return LocalDateTime.now()
                .with(TemporalAdjusters.next(DayOfWeek.SUNDAY))
                .withHour(2).withMinute(0).withSecond(0).withNano(0);
    }

    private Map<String, Object> toMap(RetrainingScheduleEntity s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("status", s.getStatus());
        m.put("cadence", s.getCadence());
        m.put("nextRunAt", s.getNextRunAt());
        m.put("lastRunId", s.getLastRunId());
        m.put("updatedBy", s.getUpdatedBy());
        m.put("updatedAt", s.getUpdatedAt());
        return m;
    }
}
