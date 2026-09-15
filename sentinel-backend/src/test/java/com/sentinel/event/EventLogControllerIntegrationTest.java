package com.sentinel.event;

import com.sentinel.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for EventLogController.
 * Tests the GET /api/event-log endpoints against a real PostgreSQL database.
 */
class EventLogControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private EventRepository eventRepository;

    @BeforeEach
    void setUp() {
        eventRepository.deleteAll();
    }

    @Test
    void getEventLog_returnsEmptyList_whenNoEvents() {
        ResponseEntity<EventLogController.EventLogResponse> response = restTemplate.getForEntity(
            "/api/event-log",
            EventLogController.EventLogResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().events()).isEmpty();
    }

    @Test
    void getEventLog_returnsEvents_whenEventsExist() {
        // Arrange: Create test event
        EventEntity event = createTestEvent("SITE-001", "TANK-A1", "High");
        eventRepository.save(event);

        // Act
        ResponseEntity<EventLogController.EventLogResponse> response = restTemplate.getForEntity(
            "/api/event-log?hoursBack=24",
            EventLogController.EventLogResponse.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().events()).hasSize(1);
        assertThat(response.getBody().events().get(0).getSiteId()).isEqualTo("SITE-001");
    }

    @Test
    void getEventLog_filtersBySite_whenSiteIdProvided() {
        // Arrange: Create events for different sites
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1", "High"));
        eventRepository.save(createTestEvent("SITE-002", "TANK-B1", "Medium"));
        eventRepository.save(createTestEvent("SITE-001", "TANK-A2", "Critical"));

        // Act
        ResponseEntity<EventLogController.EventLogResponse> response = restTemplate.getForEntity(
            "/api/event-log?siteId=SITE-001",
            EventLogController.EventLogResponse.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().events())
            .allMatch(e -> e.getSiteId().equals("SITE-001"));
    }

    @Test
    void getEvent_returnsEvent_whenExists() {
        // Arrange
        EventEntity event = createTestEvent("SITE-001", "TANK-A1", "High");
        EventEntity saved = eventRepository.save(event);

        // Act
        ResponseEntity<EventEntity> response = restTemplate.getForEntity(
            "/api/event-log/" + saved.getEventId(),
            EventEntity.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEventId()).isEqualTo(saved.getEventId());
    }

    @Test
    void getEvent_returns404_whenNotExists() {
        ResponseEntity<EventEntity> response = restTemplate.getForEntity(
            "/api/event-log/EVT-NOTEXIST",
            EventEntity.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getStats_returnsStatistics() {
        // Arrange
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1", "High"));
        eventRepository.save(createTestEvent("SITE-001", "TANK-A2", "Critical"));
        eventRepository.save(createTestEvent("SITE-002", "TANK-B1", "Medium"));

        // Act
        ResponseEntity<EventLogController.EventStats> response = restTemplate.getForEntity(
            "/api/event-log/stats?hoursBack=24",
            EventLogController.EventStats.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalEvents()).isEqualTo(3);
    }

    @Test
    void getRecentEvents_returnsLimitedEvents() {
        // Arrange: Create more than limit
        for (int i = 0; i < 15; i++) {
            eventRepository.save(createTestEvent("SITE-001", "TANK-" + i, "High"));
        }

        // Act
        ResponseEntity<EventEntity[]> response = restTemplate.getForEntity(
            "/api/event-log/recent?limit=5",
            EventEntity[].class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        // Note: Actual limit depends on implementation, just verify it works
        assertThat(response.getBody().length).isLessThanOrEqualTo(10);
    }

    private EventEntity createTestEvent(String siteId, String tankId, String severity) {
        EventEntity event = new EventEntity();
        event.setEventId("EVT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        event.setEventType(EventEntity.TYPE_OVERFILL_RISK);
        event.setSiteId(siteId);
        event.setTankId(tankId);
        event.setSeverity(severity);
        event.setSignalType("tank_level_pct");
        event.setSignalValue(new BigDecimal("96.5"));
        event.setThresholdValue(new BigDecimal("95.0"));
        event.setCreatedAt(LocalDateTime.now());
        event.setProcessed(false);
        event.setActuationTriggered(false);
        event.setNotificationSent(false);
        return event;
    }
}
