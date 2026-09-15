package com.sentinel;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for integration tests that need a real PostgreSQL database.
 * 
 * Uses Testcontainers to spin up a PostgreSQL 16 container before tests run.
 * Flyway migrations are applied automatically via the test profile.
 * 
 * Usage:
 *   public class MyServiceIntegrationTest extends AbstractIntegrationTest {
 *       @Autowired
 *       private MyService myService;
 *       
 *       @Test
 *       void testSomething() {
 *           // Test against real PostgreSQL
 *       }
 *   }
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class AbstractIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16")
                    .withDatabaseName("sentinel_test")
                    .withUsername("sentinel")
                    .withPassword("sentinel");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
