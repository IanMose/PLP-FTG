package com.sentinel.event;

import com.sentinel.actuation.ActuationService;
import com.sentinel.alert.NarrativeService;
import com.sentinel.alert.SlackNotificationService;
import com.sentinel.telemetry.TankTelemetryEntity;
import com.sentinel.telemetry.TankTelemetryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * EventService - Core orchestrator for the control-plane event loop.
 * 
 * Responsibilities:
 * 1. Detect threshold breaches from tank telemetry
 * 2. Create events with deduplication (one per loading operation)
 * 3. Route events to actuation and notification services
 * 4. Provide event feed for dashboard
 * 
 * This is the heart of the detect → act → notify demo loop.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final TankTelemetryRepository telemetryRepository;
    private final ActuationService actuationService;
    private final SlackNotificationService slackService;
    private final NarrativeService narrativeService;

    // ── Detection Methods ──────────────────────────────────────────────────────

    /**
     * Scan recent telemetry for overfill conditions and create events.
     * Called periodically by scheduler or on-demand by demo endpoint.
     */
    @Transactional
    public List<EventEntity> detectOverfillEvents(LocalDateTime since) {
        log.info("Scanning for overfill conditions since {}", since);
        
        List<TankTelemetryEntity> riskReadings = telemetryRepository.findOverfillRiskReadings(
            TankTelemetryEntity.OVERFILL_THRESHOLD, since
        );
        
        List<EventEntity> createdEvents = new ArrayList<>();
        
        for (TankTelemetryEntity reading : riskReadings) {
            if (reading.isOverfillRisk()) {
                Optional<EventEntity> event = createOverfillEventIfNew(reading);
                event.ifPresent(createdEvents::add);
            }
        }
        
        log.info("Created {} new overfill events from {} risk readings", 
            createdEvents.size(), riskReadings.size());
        
        return createdEvents;
    }

    /**
     * Detect and immediately process overfill events (full demo loop).
     * This is the main entry point for the demo - detect + act + notify in one call.
     */
    @Transactional
    public List<EventProcessingResult> detectAndProcessOverfillEvents(LocalDateTime since) {
        List<EventEntity> events = detectOverfillEvents(since);
        List<EventProcessingResult> results = new ArrayList<>();
        
        for (EventEntity event : events) {
            results.add(processEvent(event));
        }
        
        return results;
    }

    /**
     * Create an overfill event if one doesn't already exist for this loading operation.
     * Deduplication prevents multiple events for the same overfill scenario.
     */
    @Transactional
    public Optional<EventEntity> createOverfillEventIfNew(TankTelemetryEntity reading) {
        String loadingOpId = reading.getLoadingOperationId();
        
        // Deduplication: check if event already exists for this loading operation
        if (loadingOpId != null && eventRepository.existsByLoadingOperationIdAndEventType(
                loadingOpId, EventEntity.TYPE_OVERFILL_RISK)) {
            log.debug("Event already exists for loading operation {}", loadingOpId);
            return Optional.empty();
        }
        
        // Also check by source reading ID
        if (eventRepository.existsBySourceReadingId(reading.getReadingId())) {
            log.debug("Event already exists for reading {}", reading.getReadingId());
            return Optional.empty();
        }
        
        // Create new event
        String severity = reading.determineSeverity();
        EventEntity event = EventEntity.createOverfillEvent(
            reading.getSiteId(),
            reading.getTankId(),
            reading.getReadingId(),
            loadingOpId,
            reading.getTankLevelPct(),
            severity
        );
        
        EventEntity saved = eventRepository.save(event);
        log.info("Created overfill event {} for {} at {} ({}% fill)", 
            saved.getEventId(), saved.getTankId(), saved.getSiteId(), 
            reading.getTankLevelPct());
        
        return Optional.of(saved);
    }

    /**
     * Create an event directly (for demo or manual triggering).
     */
    @Transactional
    public EventEntity createEvent(
            String eventType,
            String severity,
            String siteId,
            String tankId,
            String signalType,
            BigDecimal signalValue,
            BigDecimal thresholdValue,
            String loadingOperationId) {
        
        EventEntity event = new EventEntity();
        event.setEventId("EVT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        event.setEventType(eventType);
        event.setSeverity(severity);
        event.setSiteId(siteId);
        event.setTankId(tankId);
        event.setSignalType(signalType);
        event.setSignalValue(signalValue);
        event.setThresholdValue(thresholdValue);
        event.setLoadingOperationId(loadingOperationId);
        event.setCreatedAt(LocalDateTime.now());
        event.setProcessed(false);
        
        return eventRepository.save(event);
    }

    // ── Event Processing ───────────────────────────────────────────────────────

    /**
     * Process an event through the complete control loop:
     * 1. Trigger actuation if required (valve close)
     * 2. Generate AI narrative via NarrativeService + Groq
     * 3. Send Slack notification with AI narrative
     * 4. Mark as processed
     *
     * Returns a ProcessingResult with status of each step.
     */
    @Transactional
    public EventProcessingResult processEvent(EventEntity event) {
        log.info("Processing event {}: {}", event.getEventId(), event.getDescription());

        EventProcessingResult result = new EventProcessingResult(event.getEventId());
        ActuationService.ActuationResult actuationResult = null;

        // Step 1: Trigger actuation if required
        if (event.requiresActuation()) {
            actuationResult = triggerActuation(event);
            result.setActuationTriggered(true);
            result.setActuationSuccess(actuationResult.success());
            result.setActuationId(actuationResult.actuationId());
            result.setLatencyMs(actuationResult.latencyMs());
            event.markActuationTriggered();
        }

        // Step 2: Generate AI narrative (non-blocking — falls back to template silently)
        String aiNarrative = null;
        try {
            double levelPct = event.getSignalValue() != null ? event.getSignalValue().doubleValue() : 0.0;
            long latencyMs = actuationResult != null ? actuationResult.latencyMs() : 0L;
            String actuationId = actuationResult != null ? actuationResult.actuationId() : null;
            aiNarrative = narrativeService.forOverfillEvent(
                event.getSiteId(),
                event.getTankId(),
                levelPct,
                event.getEventId(),
                actuationId,
                latencyMs
            );
            result.setAiNarrative(aiNarrative);
        } catch (Exception ex) {
            log.debug("EventService: AI narrative generation skipped: {}", ex.getMessage());
        }

        // Step 3: Send Slack notification with AI narrative
        boolean notificationSuccess = sendNotification(event, actuationResult, aiNarrative);
        result.setNotificationSent(true);
        result.setNotificationSuccess(notificationSuccess);
        event.markNotificationSent();

        // Step 4: Mark as processed
        event.markProcessed();
        eventRepository.save(event);

        result.setProcessed(true);
        log.info("Event {} processed: actuation={}, notification={}, aiNarrative={}",
            event.getEventId(), result.isActuationSuccess(), result.isNotificationSuccess(),
            aiNarrative != null ? "yes (" + aiNarrative.length() + " chars)" : "none");

        return result;
    }

    /**
     * Process all unprocessed events.
     */
    @Transactional
    public List<EventProcessingResult> processUnprocessedEvents() {
        List<EventEntity> unprocessed = eventRepository.findByProcessedFalseOrderByCreatedAtAsc();
        log.info("Found {} unprocessed events", unprocessed.size());
        
        List<EventProcessingResult> results = new ArrayList<>();
        for (EventEntity event : unprocessed) {
            results.add(processEvent(event));
        }
        return results;
    }

    // ── Integration with ActuationService and SlackService ─────────────────────

    /**
     * Trigger actuation for an event via ActuationService.
     */
    private ActuationService.ActuationResult triggerActuation(EventEntity event) {
        log.info("Triggering actuation for event {} - valve close command for tank {} at {}", 
            event.getEventId(), event.getTankId(), event.getSiteId());
        
        return actuationService.closeValve(event);
    }

    /**
     * Send Slack notification for an event via SlackNotificationService.
     * Passes AI narrative when available for the "AI Analysis" block.
     */
    private boolean sendNotification(EventEntity event, ActuationService.ActuationResult actuationResult, String aiNarrative) {
        log.info("Sending Slack notification for event {} - {} at {}",
            event.getEventId(), event.getEventType(), event.getSiteId());

        return slackService.sendOverfillAlert(event, actuationResult, aiNarrative);
    }

    // ── Query Methods ──────────────────────────────────────────────────────────

    /**
     * Get recent events for the live feed.
     */
    public List<EventEntity> getRecentEvents(int limit) {
        return eventRepository.findRecentEvents(limit);
    }

    /**
     * Get top 10 recent events.
     */
    public List<EventEntity> getRecentEvents() {
        return eventRepository.findTop10ByOrderByCreatedAtDesc();
    }

    /**
     * Get event by ID.
     */
    public Optional<EventEntity> getEvent(String eventId) {
        return eventRepository.findById(eventId);
    }

    /**
     * Get events for a specific site.
     */
    public List<EventEntity> getEventsBySite(String siteId, LocalDateTime since) {
        return eventRepository.findBySiteIdAndCreatedAtAfterOrderByCreatedAtDesc(siteId, since);
    }

    /**
     * Count overfill events (for executive dashboard).
     */
    public long countOverfillEvents(LocalDateTime since) {
        return eventRepository.countByEventTypeAndCreatedAtAfter(
            EventEntity.TYPE_OVERFILL_RISK, since
        );
    }

    /**
     * Count events that triggered actuation (for executive dashboard).
     */
    public long countActuationEvents(LocalDateTime since) {
        return eventRepository.countByActuationTriggeredTrueAndCreatedAtAfter(since);
    }

    /**
     * Count total events since a given time.
     */
    public long countTotalEvents(LocalDateTime since) {
        return eventRepository.countByCreatedAtAfter(since);
    }

    // ── Result DTO ─────────────────────────────────────────────────────────────

    /**
     * Result of processing a single event through the control loop.
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class EventProcessingResult {
        private String eventId;
        private boolean actuationTriggered;
        private boolean actuationSuccess;
        private String actuationId;
        private int latencyMs;
        private boolean notificationSent;
        private boolean notificationSuccess;
        private boolean processed;
        private String aiNarrative;

        public EventProcessingResult(String eventId) {
            this.eventId = eventId;
        }
    }
}
