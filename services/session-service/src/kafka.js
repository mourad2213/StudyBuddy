const { Kafka, logLevel } = require("kafkajs");

// ============================================
// VALIDATE & CONFIGURE KAFKA
// ============================================
const validateKafkaConfig = () => {
  // Support both KAFKA_BROKERS and KAFKA_BROKER for backwards compatibility
  const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER)?.trim();
  const username = process.env.KAFKA_USERNAME?.trim();
  const password = process.env.KAFKA_PASSWORD?.trim();

  if (!brokers) {
    throw new Error(
      "KAFKA_BROKERS (or KAFKA_BROKER) environment variable is required (comma-separated: host1:9092,host2:9092)"
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

// Build Kafka config - support both Aiven (with SASL/SSL) and local Confluent Kafka
const kafkaConfig = {
  clientId: "session-service",
  brokers,

  logLevel: logLevel.INFO,
  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
};

// Only add SASL/SSL if credentials are provided (Aiven Kafka)
if (username && password) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: "plain",
    username,
    password,
  };
}

// ============================================
// KAFKA CLIENT - LOCAL OR AIVEN
// ============================================
const kafka = new Kafka(kafkaConfig);

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

const consumer = kafka.consumer({
  groupId: "session-service-group",
});

let isProducerConnected = false;
let isConsumerConnected = false;

// ============================================
// PRODUCER CONNECTION
// ============================================
const connectProducer = async () => {
  if (isProducerConnected) return;

  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      isProducerConnected = true;
      console.log("✅ Kafka producer connected (session-service)");
      return;
    } catch (error) {
      retries--;
      console.log(
        `⏳ Producer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(error.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Producer failed to connect to Kafka after retries");
        throw new Error("Failed to connect Kafka producer");
      }
    }
  }
};

const disconnectProducer = async () => {
  if (!isProducerConnected) return;

  try {
    await producer.disconnect();
    isProducerConnected = false;
    console.log("✅ Kafka producer disconnected");
  } catch (error) {
    console.error("❌ Failed to disconnect producer:", error.message);
  }
};

// ============================================
// CONSUMER CONNECTION
// ============================================
const connectConsumer = async () => {
  if (isConsumerConnected) return;

  let retries = 10;

  while (retries > 0) {
    try {
      await consumer.connect();
      isConsumerConnected = true;
      console.log("✅ Kafka consumer connected (session-service)");
      return;
    } catch (error) {
      retries--;
      console.log(
        `⏳ Consumer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(error.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error("❌ Consumer failed to connect to Kafka after retries");
        throw new Error("Failed to connect Kafka consumer");
      }
    }
  }
};

const disconnectConsumer = async () => {
  if (!isConsumerConnected) return;

  try {
    await consumer.disconnect();
    isConsumerConnected = false;
    console.log("✅ Kafka consumer disconnected");
  } catch (error) {
    console.error("❌ Consumer disconnect failed:", error.message);
  }
};

// ============================================
// PUBLISH EVENTS
// ============================================
const publishEvent = async (topic, eventName, data) => {
  if (!isProducerConnected) {
    console.log(`📝 Kafka OFFLINE event: ${eventName}`, data);
    return { eventName, timestamp: new Date().toISOString() };
  }

  try {
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      producer: "session-service",
      correlationId:
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      payload: data,
    };

    await producer.send({
      topic,
      messages: [
        {
          key: data.sessionId || data.userId || "session-event",
          value: JSON.stringify(event),
          headers: {
            "content-type": "application/json",
            service: "session-service",
          },
        },
      ],
    });

    console.log(`✅ Published: ${eventName} → ${topic}`);
    return event;
  } catch (error) {
    console.warn(`⚠️ Publish failed: ${eventName}`, error.message);
    throw error;
  }
};

// ============================================
// SUBSCRIBE TO EVENTS
// ============================================
const subscribeToEvents = async (topics, messageHandler) => {
  try {
    await connectConsumer();

    // ✅ correct KafkaJS usage
    for (const topic of topics) {
      await consumer.subscribe({
        topic,
        fromBeginning: false,
      });
    }

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`📨 ${topic}:`, event.eventName);

          await messageHandler(event);
        } catch (error) {
          console.error("❌ Message processing error:", error.message);
        }
      },
    });

    console.log(`✅ Subscribed to: ${topics.join(", ")}`);
  } catch (error) {
    console.error("❌ Subscription failed:", error.message);
    throw error;
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  publishEvent,
  subscribeToEvents,
  connectProducer,
  disconnectProducer,
  connectConsumer,
  disconnectConsumer,
};
