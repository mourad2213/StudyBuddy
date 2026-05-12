const { Kafka, logLevel } = require("kafkajs");

const kafka = new Kafka({
  clientId: "session-service",

  // ✅ Aiven / cloud / k8s multi-broker support
  brokers: process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(",").map((b) => b.trim())
    : ["localhost:9092"],

  logLevel: logLevel.INFO,

  // ✅ Aiven SSL
  ssl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          rejectUnauthorized: false,
        }
      : false,

  // ✅ Aiven SASL
  sasl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          mechanism: "plain",
          username: process.env.KAFKA_USERNAME,
          password: process.env.KAFKA_PASSWORD,
        }
      : undefined,

  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

const consumer = kafka.consumer({
  groupId: "session-service-group",
});

let isProducerConnected = false;
let isConsumerConnected = false;

// ======================
// PRODUCER
// ======================
const connectProducer = async () => {
  if (isProducerConnected) return;

  try {
    const connectPromise = producer.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Kafka connection timeout")), 5000)
    );

    await Promise.race([connectPromise, timeoutPromise]);

    isProducerConnected = true;
    console.log("✅ Kafka producer connected");
  } catch (error) {
    console.warn(
      "⚠️ Kafka producer not available:",
      error.message
    );
    isProducerConnected = false;
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
    return { eventName, error: true };
  }
};

// ======================
// CONSUMER
// ======================
const connectConsumer = async () => {
  if (isConsumerConnected) return;

  try {
    await consumer.connect();
    isConsumerConnected = true;
    console.log("✅ Kafka consumer connected");
  } catch (error) {
    console.error("❌ Consumer connect failed:", error.message);
    throw error;
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

// FIXED: KafkaJS does NOT support { topics: [] } in subscribe
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