package com.sentinel.executive;

import com.sentinel.AbstractIntegrationTest;
import com.sentinel.event.EventEntity;
import com.sentinel.event.EventRepository;
import com.sentinel.actuation.ActuationLogEntity;
import com.sentinel.actuation.ActuationLogRepository;
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
 * Integration tests for ExecutiveController.
 * Tests the executive dashboard KPI endpoints against a real PostgreSQL database.
 */
class ExecutiveControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private ActuationLogRepository actuationLogRepository;

    @BeforeEach
    void setUp() {
        actuationLogRepository.deleteAll();
        eventRepository.deleteAll();
    }

    @Test
    void getKpis_returnsZeros_whenNoData() {
        ResponseEntity<ExecutiveController.ExecutiveKPIs> response = restTemplate.getForEntity(
            "/api/executive/kpis",
            ExecutiveController.ExecutiveKPIs.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().eventsDetected()).isZero();
        assertThat(response.getBody().shutdownsTriggered()).isZero();
    }

    @Test
    void getKpis_returnsCorrectCounts_whenDataExists() {
        // Arrange: Create events and actuations
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1"));
        eventRepository.save(createTestEvent("SITE-001", "TANK-A2"));
        eventRepository.save(createTestEvent("SITE-002", "TANK-B1"));
        
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A1", "simulated_success"));
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A2", "simulated_success"));

        // Act
        ResponseEntity<ExecutiveController.ExecutiveKPIs> response = restTemplate.getForEntity(
            "/api/executive/kpis?hoursBack=24",
            ExecutiveController.ExecutiveKPIs.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().eventsDetected()).isEqualTo(3);
        assertThat(response.getBody().shutdownsTriggered()).isEqualTo(2);
    }

    @Test
    void getDashboard_returnsFullDashboardData() {
        // Arrange
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1"));
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A1", "simulated_success"));

        // Act
        ResponseEntity<ExecutiveController.DashboardData> response = restTemplate.getForEntity(
            "/api/executive/dashboard?hoursBack=24",
            ExecutiveController.DashboardData.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().kpis()).isNotNull();
        assertThat(response.getBody().recentEvents()).isNotNull();
        assertThat(response.getBody().siteBreakdown()).isNotNull();
    }

    @Test
    void getRecentEvents_returnsEvents() {
        // Arrange
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1"));
        eventRepository.save(createTestEvent("SITE-002", "TANK-B1"));

        // Act
        ResponseEntity<ExecutiveController.EventSummary[]> response = restTemplate.getForEntity(
            "/api/executive/recent-events?limit=10",
            ExecutiveController.EventSummary[].class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().length).isEqualTo(2);
    }

    @Test
    void getEventsBySite_filtersCorrectly() {
        // Arrange
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1"));
        eventRepository.save(createTestEvent("SITE-002", "TANK-B1"));
        eventRepository.save(createTestEvent("SITE-001", "TANK-A2"));

        // Act
        ResponseEntity<ExecutiveController.EventSummary[]> response = restTemplate.getForEntity(
            "/api/executive/site/SITE-001",
            ExecutiveController.EventSummary[].class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody())
            .allMatch(e -> e.siteId().equals("SITE-001"));
    }

    @Test
    void getThangeSummary_returnsBusinessMetrics() {
        // Arrange
        eventRepository.save(createTestEvent("SITE-001", "TANK-A1"));
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A1", "simulated_success"));

        // Act
        ResponseEntity<ExecutiveController.ThangeSummary> response = restTemplate.getForEntity(
            "/api/executive/thange-summary?hoursBack=24",
            ExecutiveController.ThangeSummary.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalDetections()).isEqualTo(1);
        assertThat(response.getBody().successfulInterventions()).isEqualTo(1);
    }

    private EventEntity createTestEvent(String siteId, String tankId) {
        EventEntity event = new EventEntity();
        event.setEventId("EVT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        event.setEventType(EventEntity.TYPE_OVERFILL_RISK);
        event.setSiteId(siteId);
        event.setTankId(tankId);
        event.setSeverity("High");
        event.setSignalType("tank_level_pct");
        event.setSignalValue(new BigDecimal("96.5"));
        event.setThresholdValue(new BigDecimal("95.0"));
        event.setCreatedAt(LocalDateTime.now());
        event.setProcessed(false);
        event.setActuationTriggered(false);
        event.setNotificationSent(false);
        return event;
    }

    private ActuationLogEntity createTestActuation(String siteId, String tankId, String status) {
        ActuationLogEntity actuation = new ActuationLogEntity();
        actuation.setActuationId("ACT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        actuation.setSiteId(siteId);
        actuation.setTankId(tankId);
        actuation.setEventId("EVT-TEST-" + java.util.UUID.randomUUID().toString().substring(0, 4));
        actuation.setAction("CLOSE_VALVE");
        actuation.setStatus(status);
        actuation.setTriggeredBy("IntegrationTest");
        actuation.setRequestTimestamp(LocalDateTime.now());
        actuation.setResponseTimestamp(LocalDateTime.now().plusNanos(150_000_000));
        actuation.setLatencyMs(150);
        return actuation;
    }
}
