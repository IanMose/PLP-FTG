package com.sentinel.actuation;

import com.sentinel.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for ActuationLogController.
 * Tests the GET /api/actuation-log endpoints against a real PostgreSQL database.
 */
class ActuationLogControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ActuationLogRepository actuationLogRepository;

    @BeforeEach
    void setUp() {
        actuationLogRepository.deleteAll();
    }

    @Test
    void getActuationLog_returnsEmptyList_whenNoActuations() {
        ResponseEntity<ActuationLogController.ActuationLogResponse> response = restTemplate.getForEntity(
            "/api/actuation-log",
            ActuationLogController.ActuationLogResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().actuations()).isEmpty();
    }

    @Test
    void getActuationLog_returnsActuations_whenActuationsExist() {
        // Arrange
        ActuationLogEntity actuation = createTestActuation("SITE-001", "TANK-A1", "simulated_success");
        actuationLogRepository.save(actuation);

        // Act
        ResponseEntity<ActuationLogController.ActuationLogResponse> response = restTemplate.getForEntity(
            "/api/actuation-log?hoursBack=24",
            ActuationLogController.ActuationLogResponse.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().actuations()).hasSize(1);
    }

    @Test
    void getActuation_returnsActuation_whenExists() {
        // Arrange
        ActuationLogEntity actuation = createTestActuation("SITE-001", "TANK-A1", "simulated_success");
        ActuationLogEntity saved = actuationLogRepository.save(actuation);

        // Act
        ResponseEntity<ActuationLogEntity> response = restTemplate.getForEntity(
            "/api/actuation-log/" + saved.getActuationId(),
            ActuationLogEntity.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getActuationId()).isEqualTo(saved.getActuationId());
    }

    @Test
    void getActuation_returns404_whenNotExists() {
        ResponseEntity<ActuationLogEntity> response = restTemplate.getForEntity(
            "/api/actuation-log/ACT-NOTEXIST",
            ActuationLogEntity.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void getStats_returnsStatistics() {
        // Arrange
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A1", "simulated_success"));
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A2", "simulated_success"));
        actuationLogRepository.save(createTestActuation("SITE-002", "TANK-B1", "simulated_failure"));

        // Act
        ResponseEntity<ActuationLogController.ActuationStats> response = restTemplate.getForEntity(
            "/api/actuation-log/stats?hoursBack=24",
            ActuationLogController.ActuationStats.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalActuations()).isEqualTo(3);
        assertThat(response.getBody().successfulClosures()).isEqualTo(2);
    }

    @Test
    void getActuationsBySite_filtersCorrectly() {
        // Arrange
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A1", "simulated_success"));
        actuationLogRepository.save(createTestActuation("SITE-002", "TANK-B1", "simulated_success"));
        actuationLogRepository.save(createTestActuation("SITE-001", "TANK-A2", "simulated_success"));

        // Act
        ResponseEntity<ActuationLogEntity[]> response = restTemplate.getForEntity(
            "/api/actuation-log/site/SITE-001",
            ActuationLogEntity[].class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody())
            .allMatch(a -> a.getSiteId().equals("SITE-001"));
    }

    @Test
    void getRecentActuations_returnsActuations() {
        // Arrange
        for (int i = 0; i < 5; i++) {
            actuationLogRepository.save(createTestActuation("SITE-001", "TANK-" + i, "simulated_success"));
        }

        // Act
        ResponseEntity<ActuationLogEntity[]> response = restTemplate.getForEntity(
            "/api/actuation-log/recent",
            ActuationLogEntity[].class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().length).isGreaterThan(0);
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
        actuation.setResponseTimestamp(LocalDateTime.now().plusNanos(150_000_000)); // 150ms
        actuation.setLatencyMs(150);
        return actuation;
    }
}
