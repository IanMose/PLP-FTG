# 22 — Kafka, Notification & Audit Implementation Plan

> Sequential build guide for integrating Kafka-based async messaging,
> Africa's Talking SMS sandbox, and a full notification audit trail
> into the existing Sentinel V4 system.
>
> **Builds on:** `21_SENTINEL_V4_MASTER_BUILD_PLAN.md`, `11_V4_API_CONTRACTS.md`
> **Owned by:** Agent 1 (backend services), Agent 4 (migrations, config)
> **Broker:** Confluent Cloud free tier
> **SMS gateway:** Africa's Talking sandbox (free, no charges)
> **Notification channels:** Slack (`#sentinel-alerts`) + AT SMS simulator

---

## Prerequisites (before starting any phase)

- [ ] V4 Phase 0–2 complete — `event_log` and `actuation_log` tables exist and are populated by the demo loop
- [ ] `SlackNotificationService` is coded and working (it already is — do not rewrite it)
- [ ] `AlertKafkaProducer` and `AlertKafkaConsumer` pattern is understood — all new Kafka code follows it exactly
- [ ] Confluent Cloud account created at [confluent.io](https://confluent.io) (free, no credit card)
- [ ] Africa's Talking sandbox account created at [account.africastalking.com](https://account.africastalking.com/apps/sandbox) (free)

---

## Phase 1 — Database: Notification Audit Table

**Owner:** Agent 4
**Dependency:** None — can start immediately

### 1.1 Write Flyway migration

Create `sentinel-backend/src/main/resources/db/migration/V29__notification_log.sql`:

```sql
-- V29: Notification audit trail — one row per notification attempt per channel
-- Tracks every Slack and SMS send attempt with outcome and timestamp

CREATE TABLE notification_log (
    notification_id     VARCHAR(50)     PRIMARY KEY,
    event_id            VARCHAR(50)     REFERENCES event_log(event_id),
    channel             VARCHAR(20)     NOT NULL,
    recipient           VARCHAR(100)    NOT NULL,
    status              VARCHAR(20)     NOT NULL,
    sent_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message       TEXT,

    CONSTRAINT chk_channel CHECK (channel IN ('SLACK', 'SMS')),
    CONSTRAINT chk_notif_status CHECK (status IN ('sent', 'failed', 'disabled'))
);

CREATE INDEX idx_notification_log_event
    ON notification_log(event_id);

CREATE INDEX idx_notification_log_channel_time
    ON notification_log(channel, sent_at DESC);

COMMENT ON TABLE notification_log IS
    'Audit trail of all notification attempts — Slack and SMS — per control-plane event';
COMMENT ON COLUMN notification_log.channel IS
    'Notification channel: SLACK or SMS';
COMMENT ON COLUMN notification_log.recipient IS
    'Slack channel name (e.g. #sentinel-alerts) or phone number (+254...)';
COMMENT ON COLUMN notification_log.status IS
    'sent = delivered, failed = error, disabled = service not configured';
```

### 1.2 Create the JPA entity

`sentinel-backend/src/main/java/com/sentinel/notification/NotificationLogEntity.java`

```java
@Entity
@Table(name = "notification_log")
@Getter @Setter @NoArgsConstructor
public class NotificationLogEntity {

    @Id
    @Column(name = "notification_id", length = 50)
    private String notificationId;

    @Column(name = "event_id", length = 50)
    private String eventId;

    @Column(name = "channel", length = 20, nullable = false)
    private String channel;

    @Column(name = "recipient", length = 100, nullable = false)
    private String recipient;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public static final String CHANNEL_SLACK = "SLACK";
    public static final String CHANNEL_SMS   = "SMS";
    public static final String STATUS_SENT     = "sent";
    public static final String STATUS_FAILED   = "failed";
    public static final String STATUS_DISABLED = "disabled";

    public static NotificationLogEntity of(
            String eventId, String channel,
            String recipient, String status, String errorMessage) {

        NotificationLogEntity log = new NotificationLogEntity();
        log.setNotificationId("NTF-" +
            UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        log.setEventId(eventId);
        log.setChannel(channel);
        log.setRecipient(recipient);
        log.setStatus(status);
        log.setSentAt(LocalDateTime.now());
        log.setErrorMessage(errorMessage);
        return log;
    }
}
```

### 1.3 Create the repository

```java
public interface NotificationLogRepository extends JpaRepository<String, NotificationLogEntity> {
    List<NotificationLogEntity> findByEventIdOrderBySentAtDesc(String eventId);
    List<NotificationLogEntity> findByChannelOrderBySentAtDesc(String channel);
    long countByStatusAndSentAtAfter(String status, LocalDateTime since);
}
```

### Phase 1 exit criteria

- [ ] Flyway migration runs without error on local and test profiles
- [ ] `notification_log` table exists with correct columns and constraints
- [ ] `NotificationLogRepository.save()` persists a row correctly in a unit test

---

## Phase 2 — SMS Service: Africa's Talking Sandbox

**Owner:** Agent 1
**Dependency:** Phase 1 complete (needs `NotificationLogRepository`)

### 2.1 Add config to application.yml

```yaml
sentinel:
  sms:
    enabled: ${SMS_ENABLED:false}
    api-key: ${AT_API_KEY:}
    username: ${AT_USERNAME:sandbox}
    base-url: ${AT_BASE_URL:https://api.sandbox.africastalking.com/version1/messaging}
    sender-id: ${SMS_SENDER_ID:SENTINEL}
```

### 2.2 Create SmsNotificationService

`sentinel-backend/src/main/java/com/sentinel/notification/SmsNotificationService.java`

```java
@Service
@Slf4j
public class SmsNotificationService {

    @Value("${sentinel.sms.api-key:}")
    private String apiKey;

    @Value("${sentinel.sms.username:sandbox}")
    private String username;

    @Value("${sentinel.sms.enabled:false}")
    private boolean enabled;

    @Value("${sentinel.sms.base-url:https://api.sandbox.africastalking.com/version1/messaging}")
    private String baseUrl;

    @Value("${sentinel.sms.sender-id:SENTINEL}")
    private String senderId;

    private final RestTemplate restTemplate = new RestTemplate();
    private final NotificationLogRepository notificationLogRepository;

    public SmsNotificationService(NotificationLogRepository notificationLogRepository) {
        this.notificationLogRepository = notificationLogRepository;
    }

    public boolean sendAlert(String eventId, String phoneNumber,
                             String siteId, String tankId,
                             String severity, boolean valveClosed) {

        if (!enabled || apiKey.isBlank()) {
            log.info("SMS disabled — would notify {} for event {}", phoneNumber, eventId);
            notificationLogRepository.save(NotificationLogEntity.of(
                eventId, NotificationLogEntity.CHANNEL_SMS,
                phoneNumber, NotificationLogEntity.STATUS_DISABLED, null));
            return true;
        }

        String message = String.format(
            "SENTINEL ALERT [%s]: Tank %s at %s — " +
            "Valve %s. Check dashboard for details.",
            severity, tankId, siteId,
            valveClosed ? "CLOSED automatically" : "closure FAILED — manual action required"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("apiKey", apiKey);
        headers.set("Accept", "application/json");

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("username", username);
        body.add("to", phoneNumber);
        body.add("message", message);
        body.add("from", senderId);

        try {
            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response =
                restTemplate.postForEntity(baseUrl, request, String.class);

            boolean success = response.getStatusCode().is2xxSuccessful();
            String status = success
                ? NotificationLogEntity.STATUS_SENT
                : NotificationLogEntity.STATUS_FAILED;

            notificationLogRepository.save(NotificationLogEntity.of(
                eventId, NotificationLogEntity.CHANNEL_SMS, phoneNumber, status, null));

            log.info("SMS to {}: {}", phoneNumber, success ? "OK" : "FAILED");
            return success;

        } catch (Exception e) {
            log.error("SMS send failed for {}: {}", phoneNumber, e.getMessage());
            notificationLogRepository.save(NotificationLogEntity.of(
                eventId, NotificationLogEntity.CHANNEL_SMS,
                phoneNumber, NotificationLogEntity.STATUS_FAILED, e.getMessage()));
            return false;
        }
    }
}
```

### 2.3 Update SlackNotificationService to write to notification_log

Add `NotificationLogRepository` injection to `SlackNotificationService` and write a row after every send attempt:

```java
// After the sendToSlack() call succeeds:
notificationLogRepository.save(NotificationLogEntity.of(
    event.getEventId(), NotificationLogEntity.CHANNEL_SLACK,
    channel, NotificationLogEntity.STATUS_SENT, null));

// On failure:
notificationLogRepository.save(NotificationLogEntity.of(
    event.getEventId(), NotificationLogEntity.CHANNEL_SLACK,
    channel, NotificationLogEntity.STATUS_FAILED, e.getMessage()));
```

### Phase 2 exit criteria

- [ ] `SmsNotificationService.sendAlert()` with `SMS_ENABLED=false` writes a `disabled` row to `notification_log`
- [ ] With `SMS_ENABLED=true` and a valid sandbox key, the AT simulator shows the message
- [ ] `SlackNotificationService` writes a row to `notification_log` on every send attempt (success and failure)

---

## Phase 3 — Kafka Infrastructure

**Owner:** Agent 1 (code) + Agent 4 (config/deployment)
**Dependency:** Phase 2 complete

### 3.1 Add topic constants

Extend `KafkaTopics.java` (do not modify the existing `ALERT_CREATED` constant):

```java
public static final String OVERFILL_EVENT    = "sentinel.events.overfill";
public static final String ACTUATION_RESULT  = "sentinel.actuation.results";
```

### 3.2 Create message DTOs

`OverfillEventMessage.java`:

```java
@Builder
public record OverfillEventMessage(
    String eventId,
    String eventType,
    String severity,
    String siteId,
    String tankId,
    BigDecimal signalValue,
    BigDecimal thresholdValue,
    LocalDateTime createdAt
) {}
```

`ActuationResultMessage.java`:

```java
@Builder
public record ActuationResultMessage(
    String eventId,
    String actuationId,
    boolean success,
    String status,
    int latencyMs,
    String errorMessage,
    String siteId,
    String tankId,
    String severity
) {}
```

### 3.3 Create OverfillEventProducer

Follows `AlertKafkaProducer` pattern exactly:

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class OverfillEventProducer {

    private final KafkaTemplate<String, OverfillEventMessage> kafkaTemplate;

    @Value("${sentinel.kafka.enabled:false}")
    private boolean kafkaEnabled;

    public void publish(EventEntity event) {
        if (!kafkaEnabled) {
            log.debug("Kafka disabled — skipping publish for event {}", event.getEventId());
            return;
        }

        OverfillEventMessage message = OverfillEventMessage.builder()
            .eventId(event.getEventId())
            .eventType(event.getEventType())
            .severity(event.getSeverity())
            .siteId(event.getSiteId())
            .tankId(event.getTankId())
            .signalValue(event.getSignalValue())
            .thresholdValue(event.getThresholdValue())
            .createdAt(event.getCreatedAt())
            .build();

        kafkaTemplate.send(KafkaTopics.OVERFILL_EVENT, event.getSiteId(), message)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.warn("Kafka publish failed for event {} — {}",
                        event.getEventId(), ex.getMessage());
                } else {
                    log.debug("Published event {} → partition={} offset={}",
                        event.getEventId(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
```

### 3.4 Create ActuationKafkaConsumer

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class ActuationKafkaConsumer {

    private final ActuationService actuationService;
    private final EventRepository eventRepository;
    private final KafkaTemplate<String, ActuationResultMessage> kafkaTemplate;

    @KafkaListener(
        topics = KafkaTopics.OVERFILL_EVENT,
        groupId = "sentinel-actuation",
        autoStartup = "${sentinel.kafka.enabled:false}"
    )
    public void handleOverfillEvent(OverfillEventMessage message) {
        log.info("Actuation consumer received event {}", message.eventId());

        eventRepository.findById(message.eventId()).ifPresent(event -> {
            if (event.requiresActuation()) {
                ActuationService.ActuationResult result = actuationService.closeValve(event);

                ActuationResultMessage resultMsg = ActuationResultMessage.builder()
                    .eventId(message.eventId())
                    .actuationId(result.actuationId())
                    .success(result.success())
                    .status(result.status())
                    .latencyMs(result.latencyMs())
                    .errorMessage(result.errorMessage())
                    .siteId(message.siteId())
                    .tankId(message.tankId())
                    .severity(message.severity())
                    .build();

                kafkaTemplate.send(
                    KafkaTopics.ACTUATION_RESULT, message.siteId(), resultMsg);
            }
        });
    }
}
```

### 3.5 Create SlackKafkaConsumer

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class SlackKafkaConsumer {

    private final SlackNotificationService slackService;
    private final EventRepository eventRepository;

    @KafkaListener(
        topics = KafkaTopics.ACTUATION_RESULT,
        groupId = "sentinel-slack",
        autoStartup = "${sentinel.kafka.enabled:false}"
    )
    public void handleActuationResult(ActuationResultMessage message) {
        log.info("Slack consumer received actuation result for event {}", message.eventId());

        eventRepository.findById(message.eventId()).ifPresent(event -> {
            ActuationService.ActuationResult actuationResult =
                new ActuationService.ActuationResult(
                    message.actuationId(), message.success(),
                    message.status(), message.latencyMs(), message.errorMessage()
                );
            slackService.sendOverfillAlert(event, actuationResult);
        });
    }
}
```

### 3.6 Create SmsKafkaConsumer

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class SmsKafkaConsumer {

    private final SmsNotificationService smsService;

    // Phone numbers per site — seed in application.yml or a site_contacts table
    @Value("${sentinel.sms.demo-recipient:}")
    private String demoRecipient;

    @KafkaListener(
        topics = KafkaTopics.ACTUATION_RESULT,
        groupId = "sentinel-sms",
        autoStartup = "${sentinel.kafka.enabled:false}"
    )
    public void handleActuationResult(ActuationResultMessage message) {
        log.info("SMS consumer received actuation result for event {}", message.eventId());

        if (demoRecipient.isBlank()) {
            log.info("No SMS recipient configured for site {}", message.siteId());
            return;
        }

        smsService.sendAlert(
            message.eventId(),
            demoRecipient,
            message.siteId(),
            message.tankId(),
            message.severity(),
            message.success()
        );
    }
}
```

### 3.7 Update EventService.processEvent()

Replace the direct actuation + Slack calls with a single Kafka publish when Kafka is enabled. **The synchronous fallback path stays intact.**

```java
@Value("${sentinel.kafka.enabled:false}")
private boolean kafkaEnabled;

private final OverfillEventProducer overfillEventProducer;

@Transactional
public EventProcessingResult processEvent(EventEntity event) {
    EventProcessingResult result = new EventProcessingResult(event.getEventId());

    if (kafkaEnabled) {
        // Async path — publish and return immediately
        overfillEventProducer.publish(event);
        event.markProcessed();
        eventRepository.save(event);
        result.setProcessed(true);
        result.setNotificationSent(true);
    } else {
        // Synchronous fallback — existing behaviour unchanged
        ActuationService.ActuationResult actuationResult = null;
        if (event.requiresActuation()) {
            actuationResult = triggerActuation(event);
            result.setActuationTriggered(true);
            result.setActuationSuccess(actuationResult.success());
            result.setActuationId(actuationResult.actuationId());
            result.setLatencyMs(actuationResult.latencyMs());
            event.markActuationTriggered();
        }
        boolean notificationSuccess = sendNotification(event, actuationResult);
        result.setNotificationSent(true);
        result.setNotificationSuccess(notificationSuccess);
        event.markNotificationSent();
        event.markProcessed();
        eventRepository.save(event);
        result.setProcessed(true);
    }

    return result;
}
```

### Phase 3 exit criteria

- [ ] With `KAFKA_ENABLED=false`, demo loop behaves exactly as before — no regression
- [ ] With `KAFKA_ENABLED=true` and local Docker Kafka, demo trigger publishes to `sentinel.events.overfill`
- [ ] `ActuationKafkaConsumer` picks up the message and publishes to `sentinel.actuation.results`
- [ ] `SlackKafkaConsumer` and `SmsKafkaConsumer` both fire from the same result message
- [ ] All three `notification_log` writes complete (actuation consumer does not write to notification_log — only Slack and SMS consumers do)

---

## Phase 4 — Kafka Configuration for application.yml

**Owner:** Agent 4
**Dependency:** Phase 3 complete

### 4.1 Full Kafka config block

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}

    properties:
      security.protocol: ${KAFKA_SECURITY_PROTOCOL:PLAINTEXT}
      sasl.mechanism: ${KAFKA_SASL_MECHANISM:PLAIN}
      sasl.jaas.config: >
        org.apache.kafka.common.security.plain.PlainLoginModule required
        username="${KAFKA_SASL_USERNAME:}"
        password="${KAFKA_SASL_PASSWORD:}";

    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        spring.json.add.type.headers: false

    consumer:
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.sentinel.messaging,com.sentinel.notification"

sentinel:
  kafka:
    enabled: ${KAFKA_ENABLED:false}
  sms:
    enabled: ${SMS_ENABLED:false}
    api-key: ${AT_API_KEY:}
    username: ${AT_USERNAME:sandbox}
    base-url: ${AT_BASE_URL:https://api.sandbox.africastalking.com/version1/messaging}
    sender-id: ${SMS_SENDER_ID:SENTINEL}
    demo-recipient: ${SMS_DEMO_RECIPIENT:}
```

### 4.2 application-test.yml additions

```yaml
sentinel:
  kafka:
    enabled: false
  sms:
    enabled: false
    api-key: ""
```

### 4.3 Docker Compose for local Kafka

Create `docker-compose.yml` at the project root if it does not already exist:

```yaml
services:
  kafka:
    image: confluentinc/cp-kafka:7.6.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
```

Run with: `docker compose up -d`

### Phase 4 exit criteria

- [ ] Local dev starts without errors with `KAFKA_ENABLED=false` (no broker needed)
- [ ] Local dev with Docker Kafka and `KAFKA_ENABLED=true` connects and produces/consumes messages
- [ ] Test profile never attempts to connect to a broker

---

## Phase 5 — Confluent Cloud + Render Deployment

**Owner:** Agent 4
**Dependency:** Phase 4 complete and passing locally

### 5.1 Confluent Cloud setup

1. Create account at [confluent.io](https://confluent.io) (free, no credit card)
2. Create a **Basic** cluster — pick the same region as your Render service (Oregon)
3. Create API keys: **Cluster Overview → API Keys → Create Key → Global Access**
4. Save the key and secret — you cannot retrieve the secret again after creation
5. Create the three topics manually in the Confluent UI:

| Topic name | Partitions | Retention |
|---|---|---|
| `sentinel.alerts.created` | 1 | 7 days |
| `sentinel.events.overfill` | 1 | 7 days |
| `sentinel.actuation.results` | 1 | 7 days |

6. Copy the **Bootstrap server** URL from Cluster Settings (format: `pkc-xxxxx.region.provider.confluent.cloud:9092`)

### 5.2 Africa's Talking sandbox setup

1. Create account at [account.africastalking.com/apps/sandbox](https://account.africastalking.com/apps/sandbox) (free)
2. Go to **Settings → API Key** — copy the sandbox API key
3. Open the AT simulator at [simulator.africastalking.com:1517](https://simulator.africastalking.com:1517) — keep this tab open during the demo

### 5.3 Render environment variables

Add all of the following to **Render Dashboard → sentinel-backend → Environment**:

```
KAFKA_ENABLED              = true
KAFKA_BOOTSTRAP_SERVERS    = pkc-xxxxx.region.provider.confluent.cloud:9092
KAFKA_SECURITY_PROTOCOL    = SASL_SSL
KAFKA_SASL_MECHANISM       = PLAIN
KAFKA_SASL_USERNAME        = <confluent api key>
KAFKA_SASL_PASSWORD        = <confluent api secret>

SLACK_ENABLED              = true
SLACK_WEBHOOK_URL          = https://hooks.slack.com/services/...
SLACK_CHANNEL              = #sentinel-alerts

SMS_ENABLED                = true
AT_API_KEY                 = <sandbox api key>
AT_USERNAME                = sandbox
AT_BASE_URL                = https://api.sandbox.africastalking.com/version1/messaging
SMS_DEMO_RECIPIENT         = +254...   (the number registered in AT simulator)
```

### 5.4 Render deploy

Render redeploys automatically on push to main. After the deploy:

1. Check Render logs — look for `Connected to Confluent Cloud` or Kafka consumer startup messages
2. Hit `GET /actuator/health` — should return `200 OK`
3. Run a test trigger via `POST /api/demo/trigger-overfill`
4. Verify: Slack message arrives + AT simulator shows SMS

### Phase 5 exit criteria

- [ ] Spring Boot connects to Confluent Cloud on startup — visible in Render logs
- [ ] Demo trigger on the production URL fires Slack and AT simulator SMS
- [ ] `notification_log` table in production PostgreSQL has rows for both channels
- [ ] `GET /actuator/health` returns 200 after deploy

---

## Phase 6 — Audit API Endpoints

**Owner:** Agent 1
**Dependency:** Phase 5 complete

Expose the full audit chain through the API so the frontend can display it.

### 6.1 New endpoint: notification log

```
GET /api/notification-log?eventId={id}&limit=50
```

Response:
```json
[
  {
    "notificationId": "NTF-A1B2C3D4",
    "eventId": "EVT-X9Y8Z7W6",
    "channel": "SLACK",
    "recipient": "#sentinel-alerts",
    "status": "sent",
    "sentAt": "2026-09-15T14:32:01"
  },
  {
    "notificationId": "NTF-E5F6G7H8",
    "eventId": "EVT-X9Y8Z7W6",
    "channel": "SMS",
    "recipient": "+254712345678",
    "status": "sent",
    "sentAt": "2026-09-15T14:32:02"
  }
]
```

### 6.2 Extend executive summary endpoint

Add to `GET /api/executive/summary`:

```json
{
  "slackNotificationsSent": 12,
  "smsNotificationsSent": 12,
  "notificationFailures": 0
}
```

### 6.3 Full audit chain query

```
GET /api/audit/event/{eventId}
```

Returns the complete chain for one event:

```json
{
  "event": { ... event_log row ... },
  "actuation": { ... actuation_log row ... },
  "notifications": [ ... notification_log rows ... ]
}
```

### Phase 6 exit criteria

- [ ] `GET /api/notification-log` returns correct rows in correct order
- [ ] `GET /api/executive/summary` includes notification counts
- [ ] `GET /api/audit/event/{id}` returns the full chain with all three linked records

---

## Complete Audit Chain (End State)

```
fact_tank_telemetry          ← sensor reading that started everything
    └─► event_log            ← detection record (threshold, severity, timestamp)
            ├─► actuation_log      ← valve command (status, latency, mock/SCADA)
            └─► notification_log   ← one row per channel (SLACK sent, SMS sent)
```

Every row is linked by foreign key. Starting from any notification you can trace back to the exact sensor reading that triggered it. Starting from any sensor reading you can see every action and every notification it produced.

---

## Environment Variable Reference

| Variable | Local dev | Render (production) |
|---|---|---|
| `KAFKA_ENABLED` | `false` | `true` |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Confluent Cloud URL |
| `KAFKA_SECURITY_PROTOCOL` | not set (PLAINTEXT) | `SASL_SSL` |
| `KAFKA_SASL_USERNAME` | not set | Confluent API key |
| `KAFKA_SASL_PASSWORD` | not set | Confluent API secret |
| `SLACK_ENABLED` | `false` | `true` |
| `SLACK_WEBHOOK_URL` | not set | Slack webhook URL |
| `SMS_ENABLED` | `false` | `true` |
| `AT_API_KEY` | not set | AT sandbox API key |
| `AT_USERNAME` | not set | `sandbox` |
| `AT_BASE_URL` | not set | AT sandbox endpoint |
| `SMS_DEMO_RECIPIENT` | not set | registered AT simulator number |

---

## Failure Contingency

If Confluent Cloud is unavailable during the demo:

1. Go to Render dashboard → sentinel-backend → Environment
2. Set `KAFKA_ENABLED=false`
3. Render restarts the service (~30 seconds)
4. Synchronous path takes over — demo loop still works
5. Slack and SMS still fire (directly from `EventService`, not via Kafka)

The synchronous fallback path in `EventService.processEvent()` is never deleted. It is the permanent safety net.

---

## Phase 7 — Real-Time Tank Telemetry Streaming (sentinel.telemetry.live)

**Owner:** Agent 1 (backend producer + WebSocket broadcast), Agent 2 (frontend consumer)
**Dependency:** Phase 5 complete (Confluent Cloud connected and verified)

### What This Phase Does

Currently the Live Tank Monitor page polls the backend every few seconds via TanStack Query (`refetchInterval`). This works but has a visible lag — the level bar jumps in steps rather than updating smoothly.

This phase replaces polling with a **push-based stream**:

```
Python ETL writes telemetry row to PostgreSQL
        │
        ▼
TelemetryKafkaProducer publishes to sentinel.telemetry.live
        │
        ▼
TelemetryWebSocketConsumer reads topic
        │
        ▼
STOMP WebSocket broadcast to /topic/telemetry
        │
        ▼
Next.js frontend receives push update → tank level bar updates in real time
```

No more polling. The frontend updates the moment a new reading lands in the database.

---

### 7.1 Add topic constant

Add to `KafkaTopics.java`:

```java
public static final String TELEMETRY_LIVE = "sentinel.telemetry.live";
```

---

### 7.2 Create the telemetry message DTO

`sentinel-backend/src/main/java/com/sentinel/messaging/TelemetryLiveMessage.java`:

```java
@Builder
public record TelemetryLiveMessage(
    String readingId,
    String siteId,
    String tankId,
    BigDecimal levelPct,
    BigDecimal pressureBar,
    String valveStatus,
    Boolean overfillFlag,
    LocalDateTime recordedAt
) {}
```

---

### 7.3 Create TelemetryKafkaProducer

`sentinel-backend/src/main/java/com/sentinel/messaging/TelemetryKafkaProducer.java`:

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class TelemetryKafkaProducer {

    private final KafkaTemplate<String, TelemetryLiveMessage> kafkaTemplate;

    @Value("${sentinel.kafka.enabled:false}")
    private boolean kafkaEnabled;

    /**
     * Called every time a new telemetry row is saved to fact_tank_telemetry.
     * Publishes a lightweight message to the live telemetry topic.
     */
    public void publish(TankTelemetryEntity reading) {
        if (!kafkaEnabled) {
            log.debug("Kafka disabled — skipping telemetry publish for {}", reading.getReadingId());
            return;
        }

        TelemetryLiveMessage message = TelemetryLiveMessage.builder()
            .readingId(reading.getReadingId())
            .siteId(reading.getSiteId())
            .tankId(reading.getTankId())
            .levelPct(reading.getLevelPct())
            .pressureBar(reading.getPressureBar())
            .valveStatus(reading.getValveStatus())
            .overfillFlag(reading.isOverfillRisk())
            .recordedAt(reading.getRecordedAt())
            .build();

        kafkaTemplate.send(KafkaTopics.TELEMETRY_LIVE, reading.getTankId(), message)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.warn("Telemetry publish failed for {} — {}",
                        reading.getReadingId(), ex.getMessage());
                } else {
                    log.debug("Published telemetry {} → tank={}",
                        reading.getReadingId(), reading.getTankId());
                }
            });
    }
}
```

---

### 7.4 Wire TelemetryKafkaProducer into the telemetry save path

Find where `TankTelemetryEntity` rows are saved — this is in `DemoController` (demo path) and wherever the ETL scheduler writes new readings. After each `telemetryRepository.save(reading)` call, add:

```java
telemetryKafkaProducer.publish(reading);
```

This is a fire-and-forget call. If Kafka is disabled, the producer returns immediately with no side effects.

---

### 7.5 Create TelemetryWebSocketConsumer

This consumer reads from the Kafka topic and broadcasts each message to all connected WebSocket clients.

The WebSocket infrastructure (`spring-boot-starter-websocket`, STOMP, SockJS) is **already in the project** — `AlertKafkaConsumer` already uses it for alert broadcasts. This consumer follows the same pattern.

`sentinel-backend/src/main/java/com/sentinel/messaging/TelemetryWebSocketConsumer.java`:

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class TelemetryWebSocketConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    @KafkaListener(
        topics = KafkaTopics.TELEMETRY_LIVE,
        groupId = "sentinel-telemetry-ws",
        autoStartup = "${sentinel.kafka.enabled:false}"
    )
    public void handleTelemetryReading(TelemetryLiveMessage message) {
        log.debug("Broadcasting telemetry update for tank {}", message.tankId());

        // Broadcast to all frontend clients subscribed to /topic/telemetry
        messagingTemplate.convertAndSend("/topic/telemetry", message);

        // Also broadcast to tank-specific channel for targeted updates
        messagingTemplate.convertAndSend(
            "/topic/telemetry/" + message.tankId(), message);
    }
}
```

---

### 7.6 Frontend: replace polling with WebSocket subscription

**Current approach (polling):**
```typescript
// TanStack Query polls every 5 seconds
const { data } = useQuery({
    queryKey: ['tank-telemetry'],
    queryFn: () => fetchTelemetry(),
    refetchInterval: 5000,
})
```

**New approach (WebSocket push):**

Install the STOMP client if not already present:
```bash
npm install @stomp/stompjs sockjs-client
npm install --save-dev @types/sockjs-client
```

Create a custom hook `useLiveTelemetry.ts`:

```typescript
import { useEffect, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export interface TelemetryReading {
  readingId: string
  siteId: string
  tankId: string
  levelPct: number
  pressureBar: number
  valveStatus: string
  overfillFlag: boolean
  recordedAt: string
}

export function useLiveTelemetry(tankId?: string) {
  const [readings, setReadings] = useState<TelemetryReading[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${process.env.NEXT_PUBLIC_API_URL}/ws`),
      onConnect: () => {
        setConnected(true)

        // Subscribe to tank-specific topic if tankId provided,
        // otherwise subscribe to all telemetry
        const topic = tankId
          ? `/topic/telemetry/${tankId}`
          : `/topic/telemetry`

        client.subscribe(topic, (frame) => {
          const reading: TelemetryReading = JSON.parse(frame.body)
          setReadings(prev => [reading, ...prev].slice(0, 100)) // keep last 100
        })
      },
      onDisconnect: () => setConnected(false),
      reconnectDelay: 5000, // auto-reconnect after 5s
    })

    client.activate()
    return () => { client.deactivate() }
  }, [tankId])

  return { readings, connected }
}
```

Use in the Live Tank Monitor page:

```typescript
// Replace the polling useQuery with:
const { readings, connected } = useLiveTelemetry()

// Show connection status in the UI
<span>{connected ? '● Live' : '○ Connecting...'}</span>
```

---

### 7.7 Add topic to Confluent Cloud

In Confluent Cloud → Topics → Add topic:

| Topic name | Partitions | Notes |
|---|---|---|
| `sentinel.telemetry.live` | 1 | Retention can be shorter — 1 day is enough for live display |

---

### 7.8 MSW mock for frontend development

Before the backend WebSocket endpoint is live, Agent 2 can simulate the stream using a mock that pushes updates on an interval:

```typescript
// In your MSW setup or a dev-only hook
export function useMockLiveTelemetry() {
  const [readings, setReadings] = useState<TelemetryReading[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setReadings(prev => [{
        readingId: `READ-${Date.now()}`,
        siteId: 'site-003',
        tankId: 'TANK-A1',
        levelPct: 75 + Math.random() * 25,  // 75–100% range
        pressureBar: 2.1 + Math.random(),
        valveStatus: 'Open',
        overfillFlag: false,
        recordedAt: new Date().toISOString(),
      }, ...prev].slice(0, 100))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return { readings, connected: true }
}
```

Swap `useMockLiveTelemetry` for `useLiveTelemetry` once the backend WebSocket endpoint is deployed.

---

### Phase 7 exit criteria

- [ ] New telemetry rows saved to `fact_tank_telemetry` are immediately published to `sentinel.telemetry.live`
- [ ] `TelemetryWebSocketConsumer` receives the message and broadcasts to `/topic/telemetry`
- [ ] Frontend `useLiveTelemetry` hook receives the update without polling
- [ ] Tank level bar on the Live Tank Monitor page updates within 1–2 seconds of a new reading
- [ ] Connection status indicator shows `● Live` when WebSocket is connected
- [ ] With `KAFKA_ENABLED=false`, the existing polling behaviour continues unchanged — no regression

---

### Updated Topic Reference (All Phases)

| Topic | Producer | Consumer(s) | Purpose |
|---|---|---|---|
| `sentinel.alerts.created` | `AlertKafkaProducer` (existing) | `AlertKafkaConsumer` (existing) | Alert WebSocket broadcast |
| `sentinel.events.overfill` | `OverfillEventProducer` | `ActuationKafkaConsumer` | Triggers valve close |
| `sentinel.actuation.results` | `ActuationKafkaConsumer` | `SlackKafkaConsumer`, `SmsKafkaConsumer` | Fans out notifications |
| `sentinel.telemetry.live` | `TelemetryKafkaProducer` | `TelemetryWebSocketConsumer` | Real-time tank level display |
