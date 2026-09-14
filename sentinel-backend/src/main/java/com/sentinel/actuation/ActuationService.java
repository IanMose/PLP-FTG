package com.sentinel.actuation;

import com.sentinel.event.EventEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * ActuationService - Simulated valve control for Stage 3 demo.
 * 
 * This service simulates valve actuation with:
 * - 95% success rate (configurable)
 * - Realistic latency simulation (50-200ms)
 * - Full audit trail in actuation_log table
 * 
 * In production, this would integrate with KPC SCADA systems.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ActuationService {

    private final ActuationLogRepository actuationLogRepository;
    
    // Simulation parameters
    private static final double SUCCESS_RATE = 0.95;
    private static final int MIN_LATENCY_MS = 50;
    private static final int MAX_LATENCY_MS = 200;
    
    private final Random random = new Random();

    // ── Main Actuation Methods ─────────────────────────────────────────────────

    /**
     * Close valve for a tank in response to an overfill event.
     * This is the primary entry point called by EventService.
     * 
     * @param event The overfill event triggering the actuation
     * @return ActuationResult with status and details
     */
    @Transactional
    public ActuationResult closeValve(EventEntity event) {
        log.info("Initiating valve close for event {} - tank {} at {}", 
            event.getEventId(), event.getTankId(), event.getSiteId());
        
        // Create pending actuation record
        ActuationLogEntity actuation = ActuationLogEntity.createCloseValveCommand(
            event.getEventId(),
            event.getSiteId(),
            event.getTankId()
        );
        actuation = actuationLogRepository.save(actuation);
        
        // Simulate the actuation
        ActuationResult result = simulateActuation(actuation);
        
        // Update and save the actuation record
        actuationLogRepository.save(actuation);
        
        log.info("Valve close {} for event {}: {} ({}ms)", 
            result.success() ? "succeeded" : "failed",
            event.getEventId(),
            actuation.getStatus(),
            actuation.getLatencyMs());
        
        return result;
    }

    /**
     * Close valve directly (for manual/demo triggering without an event).
     */
    @Transactional
    public ActuationResult closeValveDirect(String siteId, String tankId, String triggeredBy) {
        log.info("Direct valve close request for tank {} at {} by {}", tankId, siteId, triggeredBy);
        
        ActuationLogEntity actuation = ActuationLogEntity.createPending(
            null, // no event
            siteId,
            tankId,
            ActuationLogEntity.ACTION_CLOSE_VALVE,
            triggeredBy
        );
        actuation = actuationLogRepository.save(actuation);
        
        ActuationResult result = simulateActuation(actuation);
        actuationLogRepository.save(actuation);
        
        return result;
    }

    /**
     * Emergency stop - close valve with highest priority.
     */
    @Transactional
    public ActuationResult emergencyStop(String siteId, String tankId, String triggeredBy) {
        log.warn("EMERGENCY STOP requested for tank {} at {} by {}", tankId, siteId, triggeredBy);
        
        ActuationLogEntity actuation = ActuationLogEntity.createPending(
            null,
            siteId,
            tankId,
            ActuationLogEntity.ACTION_EMERGENCY_STOP,
            triggeredBy
        );
        actuation.setNotes("EMERGENCY STOP - Highest priority actuation");
        actuation = actuationLogRepository.save(actuation);
        
        // Emergency stop always succeeds in simulation
        actuation.markSuccess(simulateLatency());
        actuationLogRepository.save(actuation);
        
        return new ActuationResult(
            actuation.getActuationId(),
            true,
            actuation.getStatus(),
            actuation.getLatencyMs(),
            null
        );
    }

    // ── Simulation Logic ───────────────────────────────────────────────────────

    /**
     * Simulate the actuation with realistic latency and success rate.
     */
    private ActuationResult simulateActuation(ActuationLogEntity actuation) {
        // Simulate network/PLC latency
        int latency = simulateLatency();
        
        // Simulate success/failure based on configured rate
        boolean success = random.nextDouble() < SUCCESS_RATE;
        
        if (success) {
            actuation.markSuccess(latency);
            return new ActuationResult(
                actuation.getActuationId(),
                true,
                ActuationLogEntity.STATUS_SIMULATED_SUCCESS,
                latency,
                null
            );
        } else {
            String error = generateSimulatedError();
            actuation.markFailure(error);
            return new ActuationResult(
                actuation.getActuationId(),
                false,
                ActuationLogEntity.STATUS_SIMULATED_FAILURE,
                latency,
                error
            );
        }
    }

    /**
     * Simulate realistic latency.
     */
    private int simulateLatency() {
        return MIN_LATENCY_MS + random.nextInt(MAX_LATENCY_MS - MIN_LATENCY_MS);
    }

    /**
     * Generate a realistic-looking simulated error message.
     */
    private String generateSimulatedError() {
        String[] errors = {
            "Simulated PLC communication timeout",
            "Simulated valve actuator busy",
            "Simulated network latency exceeded threshold",
            "Simulated command acknowledgment not received"
        };
        return errors[random.nextInt(errors.length)];
    }

    // ── Query Methods ──────────────────────────────────────────────────────────

    /**
     * Get actuation by ID.
     */
    public Optional<ActuationLogEntity> getActuation(String actuationId) {
        return actuationLogRepository.findById(actuationId);
    }

    /**
     * Get actuation for an event.
     */
    public Optional<ActuationLogEntity> getActuationByEvent(String eventId) {
        return actuationLogRepository.findByEventId(eventId);
    }

    /**
     * Get recent actuations.
     */
    public List<ActuationLogEntity> getRecentActuations() {
        return actuationLogRepository.findTop10ByOrderByRequestTimestampDesc();
    }

    /**
     * Get actuations for a site.
     */
    public List<ActuationLogEntity> getActuationsBySite(String siteId, LocalDateTime since) {
        return actuationLogRepository.findBySiteIdAndRequestTimestampAfterOrderByRequestTimestampDesc(
            siteId, since
        );
    }

    // ── Analytics Methods (for Executive Dashboard) ────────────────────────────

    /**
     * Count successful valve closures (shutdowns triggered).
     */
    public long countSuccessfulClosures(LocalDateTime since) {
        return actuationLogRepository.countByStatusAndRequestTimestampAfter(
            ActuationLogEntity.STATUS_SIMULATED_SUCCESS, since
        );
    }

    /**
     * Get success rate as percentage.
     */
    public Double getSuccessRate(LocalDateTime since) {
        return actuationLogRepository.getSuccessRateSince(since);
    }

    /**
     * Get average latency in milliseconds.
     */
    public Double getAverageLatency(LocalDateTime since) {
        return actuationLogRepository.getAverageLatencySince(since);
    }

    /**
     * Calculate litres saved based on successful closures.
     * Assumes average of 500 litres saved per successful valve closure.
     */
    public long calculateLitresSaved(LocalDateTime since) {
        long successfulClosures = countSuccessfulClosures(since);
        return successfulClosures * 500L; // 500L average per overfill prevented
    }

    /**
     * Calculate KES saved based on litres saved.
     * Assumes KES 150 per litre of fuel saved.
     */
    public long calculateKesSaved(LocalDateTime since) {
        return calculateLitresSaved(since) * 150L;
    }

    // ── Result DTO ─────────────────────────────────────────────────────────────

    /**
     * Result of an actuation attempt.
     */
    public record ActuationResult(
        String actuationId,
        boolean success,
        String status,
        int latencyMs,
        String errorMessage
    ) {
        public String getDescription() {
            if (success) {
                return String.format("Actuation %s succeeded in %dms", actuationId, latencyMs);
            } else {
                return String.format("Actuation %s failed: %s", actuationId, errorMessage);
            }
        }
    }
}
