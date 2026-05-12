# Unified Kafka Configuration - Developer Quick Reference

## Standard Pattern (CommonJS)

Use this template for CommonJS services:

```javascript
const { Kafka } = require("kafkajs");

// ============================================
// VALIDATE REQUIRED AIVEN CONFIGURATION
// ============================================
const validateKafkaConfig = () => {
  const brokers = process.env.KAFKA_BROKERS?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS environment variable is required (comma-separated: host1:9092,host2:9092)"
    );
  }

  if (!username || !password) {
    throw new Error(
      "KAFKA_USERNAME and KAFKA_PASSWORD environment variables are required for Aiven"
    );
  }

  return { brokers, username, password };
};

const { brokers: brokerString, username, password } = validateKafkaConfig();
const brokers = brokerString
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No valid brokers found after parsing KAFKA_BROKERS");
}

// ============================================
// KAFKA CLIENT - AIVEN ONLY
// ============================================
const kafka = new Kafka({
  clientId: "your-service-name",
  brokers,

  // ✅ ALWAYS use SSL for Aiven
  ssl: true,

  // ✅ ALWAYS use SASL plain for Aiven
  sasl: {
    mechanism: "plain",
    username,
    password,
  },

  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

const producer = kafka.producer();

// ============================================
// CONNECTION RETRY LOGIC
// ============================================
async function connectProducer() {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected");
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ Retrying in 5s... (${retries} left)`);
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        throw new Error("Failed to connect Kafka producer");
      }
    }
  }
}

// ============================================
// PUBLISHING
// ============================================
async function sendEvent(topic, eventName, data) {
  try {
    const message = {
      eventName,
      timestamp: new Date().toISOString(),
      service: "your-service-name",
      payload: data,
    };

    await producer.send({
      topic,
      messages: [
        {
          key: data.userId || "event-key",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "your-service-name",
          },
        },
      ],
    });

    console.log("📤 Event published:", eventName);
    return message;
  } catch (err) {
    console.error("Error sending event:", err.message);
    throw err;
  }
}

module.exports = { kafka, producer, connectProducer, sendEvent };
```

---

## Standard Pattern (ES6 Modules)

Use this template for ES6 module services:

```javascript
import { Kafka } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

// ============================================
// VALIDATE REQUIRED AIVEN CONFIGURATION
// ============================================
const validateKafkaConfig = () => {
  const brokers = process.env.KAFKA_BROKERS?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS environment variable is required (comma-separated: host1:9092,host2:9092)"
    );
  }

  if (!username || !password) {
    throw new Error(
      "KAFKA_USERNAME and KAFKA_PASSWORD environment variables are required for Aiven"
    );
  }

  return { brokers, username, password };
};

const { brokers: brokerString, username, password } = validateKafkaConfig();
const brokers = brokerString
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error("No valid brokers found after parsing KAFKA_BROKERS");
}

// ============================================
// KAFKA CLIENT - AIVEN ONLY
// ============================================
const kafka = new Kafka({
  clientId: "your-service-name",
  brokers,

  // ✅ ALWAYS use SSL for Aiven
  ssl: true,

  // ✅ ALWAYS use SASL plain for Aiven
  sasl: {
    mechanism: "plain",
    username,
    password,
  },

  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

const producer = kafka.producer();

// ============================================
// CONNECTION RETRY LOGIC
// ============================================
export async function connectProducer() {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log("✅ Kafka Producer Connected");
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ Retrying in 5s... (${retries} left)`);
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        throw new Error("Failed to connect Kafka producer");
      }
    }
  }
}

// ============================================
// PUBLISHING
// ============================================
export async function sendEvent(topic, eventName, data) {
  try {
    const message = {
      eventName,
      timestamp: new Date().toISOString(),
      service: "your-service-name",
      payload: data,
    };

    await producer.send({
      topic,
      messages: [
        {
          key: data.userId || "event-key",
          value: JSON.stringify(message),
          headers: {
            "content-type": "application/json",
            service: "your-service-name",
          },
        },
      ],
    });

    console.log("📤 Event published:", eventName);
    return message;
  } catch (err) {
    console.error("Error sending event:", err.message);
    throw err;
  }
}

export { kafka, producer };
```

---

## Key Principles

### 1. Always Validate Configuration
```javascript
// ✅ GOOD - Throws at startup
if (!brokers || !username || !password) {
  throw new Error("Required env vars missing");
}

// ❌ BAD - Silently falls back
brokers = process.env.KAFKA_BROKERS || "localhost:9092"
```

### 2. Always Use SSL for Aiven
```javascript
// ✅ GOOD
ssl: true

// ❌ BAD - Conditional
ssl: process.env.KAFKA_PASSWORD ? true : false

// ❌ BAD - With reject bypass
ssl: { rejectUnauthorized: false }
```

### 3. Always Use SASL PLAIN
```javascript
// ✅ GOOD
sasl: {
  mechanism: "plain",
  username: process.env.KAFKA_USERNAME,
  password: process.env.KAFKA_PASSWORD,
}

// ❌ BAD - Conditional
sasl: process.env.KAFKA_USERNAME ? { ... } : undefined
```

### 4. Consistent Retry Logic
```javascript
// ✅ GOOD - Clear retries
let retries = 10;
while (retries > 0) {
  try {
    await producer.connect();
    return;
  } catch (err) {
    retries--;
    await new Promise(res => setTimeout(res, 5000));
    if (retries === 0) throw err;
  }
}

// ❌ BAD - Silent failure
try {
  await producer.connect();
} catch (err) {
  console.warn("Connection failed");
}
```

### 5. Always Include Message Headers and Keys
```javascript
// ✅ GOOD
await producer.send({
  topic,
  messages: [{
    key: data.userId,  // For partitioning
    value: JSON.stringify(message),
    headers: {
      "content-type": "application/json",
      service: "your-service",
    },
  }],
});

// ❌ BAD - No keys or headers
await producer.send({
  topic,
  messages: [{ value: JSON.stringify(message) }],
});
```

---

## Environment Setup

Create `.env` file or set in deployment:

```bash
# Required for ALL services
KAFKA_BROKERS=broker1.aiven.io:9092,broker2.aiven.io:9092,broker3.aiven.io:9092
KAFKA_USERNAME=your_aiven_username
KAFKA_PASSWORD=your_aiven_password

# Optional but recommended
LOG_LEVEL=info
NODE_ENV=production
```

---

## Common Patterns

### Consumer with Retry
```javascript
const consumer = kafka.consumer({ groupId: "service-group" });

export async function connectConsumer() {
  let retries = 10;
  while (retries > 0) {
    try {
      await consumer.connect();
      console.log("✅ Consumer Connected");
      return;
    } catch (err) {
      retries--;
      await new Promise(res => setTimeout(res, 5000));
      if (retries === 0) throw err;
    }
  }
}

export async function subscribeAndConsume(topics, handler) {
  await connectConsumer();
  
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await handler(topic, event);
      } catch (err) {
        console.error("Error processing message:", err.message);
      }
    },
  });
}
```

### Cleanup on Shutdown
```javascript
async function shutdown() {
  console.log("Shutting down...");
  
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log("✅ Kafka disconnected");
  } catch (err) {
    console.error("Error during shutdown:", err.message);
  }
  
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

---

## Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| `KAFKA_BROKERS is required` | Env var not set | Set KAFKA_BROKERS before starting service |
| `ENOTFOUND kafka` | Using hardcoded hostname | Remove hardcoded values, use env var |
| `NaN port` | Malformed broker string | Ensure format: `host1:9092,host2:9092` |
| `SSL alert 116` | Using self-signed cert bypass | Use proper `ssl: true` with valid cert |
| `Authentication failed` | Wrong credentials | Verify KAFKA_USERNAME and KAFKA_PASSWORD |
| Connection timeout | Broker unreachable | Check network access to Aiven brokers |

---

## Deployment Checklist

- [ ] All services have unified kafka.js configuration
- [ ] Environment variables set in deployment
- [ ] No hardcoded localhost or kafka:29092
- [ ] No rejectUnauthorized: false in SSL config
- [ ] All services throw on missing KAFKA_BROKERS
- [ ] Connection retry logic tested (50s timeout)
- [ ] Message headers and keys verified in logs
- [ ] No ENOTFOUND or NaN port errors
- [ ] Event topics and consumer groups documented
- [ ] Aiven cluster credentials secured
