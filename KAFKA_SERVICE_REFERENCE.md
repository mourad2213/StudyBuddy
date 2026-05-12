# Service-by-Service Kafka Configuration Reference

## 1. Availability Service

**File**: `services/availability-service/kafka.js` (CommonJS)

**Key Functions**:
- `connectProducer()` - Connects with 10 retries
- `disconnectProducer()` - Graceful shutdown
- `publishEvent(eventType, data)` - Publish to `availability-events` topic
- `publishAvailabilityEvent(eventType, data)` - Publish to event-specific topic

**Topics**: `availability-events`

**Exports**: `kafka`, `producer`, `connectProducer`, `disconnectProducer`, `initKafka`, `closeKafka`, `publishEvent`, `publishAvailabilityEvent`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "availability-service",
  brokers,           // From KAFKA_BROKERS env
  ssl: true,         // ✅ Always enabled
  sasl: {
    mechanism: "plain",
    username,        // From KAFKA_USERNAME env
    password,        // From KAFKA_PASSWORD env
  },
  retry: { ... }
});
```

**Usage**:
```javascript
const { initKafka, publishEvent, closeKafka } = require("./kafka");

await initKafka();  // Connects producer
await publishEvent("AvailabilityUpdated", { userId: "123", ... });
await closeKafka();  // Disconnects
```

---

## 2. Profile Service

**File**: `services/profile-service/kafka.js` (CommonJS)

**Key Functions**:
- `connectKafka()` - Connects with 10 retries
- `disconnectKafka()` - Graceful shutdown
- `sendEvent(eventName, payload)` - Publish to `study-events` topic

**Topics**: `study-events`

**Exports**: `kafka`, `producer`, `connectKafka`, `disconnectKafka`, `sendEvent`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "profile-service",
  brokers,           // From KAFKA_BROKERS env
  ssl: true,
  sasl: { mechanism: "plain", username, password },
  retry: { ... }
});
```

**Usage**:
```javascript
const { connectKafka, sendEvent } = require("./kafka");

await connectKafka();
await sendEvent("ProfileUpdated", { userId: "123", major: "CS" });
```

---

## 3. Notification Service

**File**: `services/notification-service/kafka.js` (CommonJS)

**Key Functions**:
- `connectConsumer()` - Connects with 10 retries
- `disconnectConsumer()` - Graceful shutdown
- `runConsumer()` - Subscribes to topics and processes events
  - Handles: SESSION_CREATED, SESSION_UPDATED, RecommendationsGenerated, BuddyRequestCreated, MessageSent, ConversationCreated, StudySessionCreated, InvitationResponded, SessionJoined, SessionCancelled

**Topics**: `study-events`, `session-events`, `RecommendationsGenerated`, `BuddyRequestCreated`

**Consumer Group**: `notification-group`

**Exports**: `kafka`, `consumer`, `connectConsumer`, `disconnectConsumer`, `runConsumer`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "notification-service",
  brokers,           // From KAFKA_BROKERS env
  ssl: true,
  sasl: { mechanism: "plain", username, password },
  retry: { ... }
});

const consumer = kafka.consumer({ groupId: "notification-group" });
```

**Usage**:
```javascript
const { runConsumer } = require("./kafka");

await runConsumer();  // Runs forever, processing events
```

---

## 4. Matching Service

**File**: `services/matching-service/kafka.js` (ES6 Modules)

**Key Functions**:
- `connectConsumer()` - Connects with 10 retries
- `connectProducer()` - Connects with 10 retries
- `disconnectConsumer()` - Graceful shutdown
- `disconnectProducer()` - Graceful shutdown
- `subscribeToEvents()` - Subscribe to all relevant topics
- `consumeEvents(handler)` - Process events with handler callback
- `produceRecommendationsEvent(recommendations, userId)` - Publish matches
- `produceEvent(topic, payload)` - Generic event producer

**Topics**: 
- **Consumes**: UserPreferencesUpdated, AvailabilityCreated, AvailabilityUpdated, AvailabilityDeleted, BuddyRequestCreated
- **Produces**: RecommendationsGenerated

**Consumer Group**: `matching-service-group`

**Exports**: `connectConsumer`, `connectProducer`, `disconnectConsumer`, `disconnectProducer`, `subscribeToEvents`, `consumeEvents`, `produceRecommendationsEvent`, `produceEvent`, `MATCHING_EVENTS`, `MATCHING_WEIGHTS`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "matching-service",
  brokers,           // From KAFKA_BROKERS env
  ssl: true,
  sasl: { mechanism: "plain", username, password },
  retry: { ... }
});

const consumer = kafka.consumer({ groupId: "matching-service-group" });
const producer = kafka.producer();
```

**Usage**:
```javascript
import { connectConsumer, connectProducer, subscribeToEvents, produceRecommendationsEvent } from "./kafka.js";

await connectConsumer();
await connectProducer();
await subscribeToEvents();
await consumeEvents(async (topic, event) => {
  // Process event
  await produceRecommendationsEvent(matches, userId);
});
```

---

## 5. Messaging Service

**File**: `services/messaging-service/kafka.js` (ES6 Modules)

**Key Functions**:
- `connectProducer()` - Connects with 10 retries
- `connectConsumer()` - Connects with 10 retries
- `disconnectProducer()` - Graceful shutdown
- `disconnectConsumer()` - Graceful shutdown
- `subscribeToEvents(callback)` - Subscribe and process with callback
- `sendEvent(eventName, payload)` - Publish to `study-events`

**Topics**: `study-events`, `BuddyRequestCreated`

**Consumer Group**: `messaging-service-group`

**Exports**: `connectProducer`, `connectConsumer`, `disconnectProducer`, `disconnectConsumer`, `subscribeToEvents`, `sendEvent`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "messaging-service",
  brokers,           // From KAFKA_BROKERS env
  ssl: true,
  sasl: { mechanism: "plain", username, password },
  logLevel: logLevel.INFO,
  retry: { ... }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "messaging-service-group" });
```

**Usage**:
```javascript
import { connectProducer, connectConsumer, subscribeToEvents, sendEvent } from "./kafka.js";

await connectProducer();
await connectConsumer();
await subscribeToEvents(async (event) => {
  // Handle event
  await sendEvent("MessageSent", { content: "...", userId: "..." });
});
```

---

## 6. Session Service

**Files**: 
- `services/session-service/kafka.js` (Wrapper - CommonJS)
- `services/session-service/src/kafka.js` (Implementation - CommonJS)

**Key Functions**:
- `connectProducer()` - Connects with 10 retries, idempotent
- `connectConsumer()` - Connects with 10 retries, idempotent
- `disconnectProducer()` - Graceful shutdown
- `disconnectConsumer()` - Graceful shutdown
- `publishEvent(topic, eventName, data)` - Publish event with offline fallback
- `subscribeToEvents(topics, messageHandler)` - Subscribe and process

**Topics**: `session-events`

**Consumer Group**: `session-service-group`

**Exports**: `kafka`, `producer`, `consumer`, `publishEvent`, `subscribeToEvents`, `connectProducer`, `disconnectProducer`, `connectConsumer`, `disconnectConsumer`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "session-service",
  brokers,           // From KAFKA_BROKERS env
  logLevel: logLevel.INFO,
  ssl: true,
  sasl: { mechanism: "plain", username, password },
  retry: { ... }
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

const consumer = kafka.consumer({ groupId: "session-service-group" });
```

**Usage**:
```javascript
const { initializeKafka, publishMessage, disconnectKafka } = require("./kafka");

// In index.js:
try {
  await initializeKafka();
} catch (error) {
  console.warn("Kafka initialization failed:", error.message);
}

// Later:
await publishMessage("session-events", "SessionCreated", { sessionId: "..." });
```

---

## 7. User Service

**File**: `services/user-service/kafka.js` (ES6 Modules)

**Key Functions**:
- `connectProducer()` - Connects with 10 retries
- `disconnectProducer()` - Graceful shutdown
- `sendEvent(topic, data)` - Publish event

**Topics**: Multiple (auth, profile, etc.)

**Exports**: `kafka`, `producer`, `connectProducer`, `disconnectProducer`, `sendEvent`

**Configuration**:
```javascript
const kafka = new Kafka({
  clientId: "user-service",
  brokers,           // From KAFKA_BROKERS env
  ssl: true,
  sasl: { mechanism: "plain", username, password },
  retry: { ... }
});

const producer = kafka.producer();
```

**Usage**:
```javascript
import { connectProducer, sendEvent } from "./kafka.js";

await connectProducer();
await sendEvent("user-events", { event: "UserCreated", userId: "123" });
```

---

## Environment Variables Required

All services require these to be set:

```bash
# Aiven Kafka Cluster
KAFKA_BROKERS=broker1.aiven.io:9092,broker2.aiven.io:9092,broker3.aiven.io:9092

# Aiven Authentication
KAFKA_USERNAME=avnadmin
KAFKA_PASSWORD=your_password_here
```

**Missing any of these** → Service startup error with clear message.

---

## Retry Strategy (All Services)

```
Attempt 1 → Wait 5s → Attempt 2 → ... → Attempt 10 → Throw Error
Total time: ~50 seconds before failure
```

All services follow this pattern for both producer and consumer connections.

---

## Error Handling Examples

### Before (❌ Broken)
```javascript
// Silently falls back
brokers: process.env.KAFKA_BROKERS || ["localhost:9092"]

// Conditional SSL (wrong)
ssl: process.env.KAFKA_PASSWORD ? true : false

// No retry, silent fail
try { await producer.connect(); } catch { /* ignore */ }
```

### After (✅ Fixed)
```javascript
// Validates and throws
if (!brokers) throw new Error("KAFKA_BROKERS required");
brokers = process.env.KAFKA_BROKERS.split(",").map(b => b.trim());

// Always SSL for Aiven
ssl: true

// Explicit retry with clear logging
let retries = 10;
while (retries > 0) {
  try {
    await producer.connect();
    return;
  } catch (err) {
    retries--;
    console.log(`⏳ Retrying (${retries} left)`);
    await new Promise(res => setTimeout(res, 5000));
    if (retries === 0) throw err;
  }
}
```

---

## Topics & Events Summary

| Service | Publishes To | Subscribes From | Group |
|---------|--------------|-----------------|-------|
| availability-service | availability-events | (none) | - |
| profile-service | study-events | (none) | - |
| notification-service | (none) | study-events, session-events, RecommendationsGenerated, BuddyRequestCreated | notification-group |
| matching-service | RecommendationsGenerated | UserPreferencesUpdated, AvailabilityCreated, AvailabilityUpdated, AvailabilityDeleted, BuddyRequestCreated | matching-service-group |
| messaging-service | study-events | study-events, BuddyRequestCreated | messaging-service-group |
| session-service | session-events | (configurable) | session-service-group |
| user-service | user-events | (none) | - |

---

## Verification Steps

1. **Start each service** with env vars set:
   ```bash
   export KAFKA_BROKERS="..." KAFKA_USERNAME="..." KAFKA_PASSWORD="..."
   npm run dev
   ```

2. **Check logs** for connection success:
   ```
   ✅ Kafka Producer Connected (service-name)
   ```

3. **No errors should appear**:
   - ENOTFOUND kafka ❌
   - NaN port ❌
   - SSL alert ❌
   - localhost:9092 ❌

4. **Trigger events** and verify they flow through Aiven

All configurations are now **production-ready for Aiven Kafka**.
