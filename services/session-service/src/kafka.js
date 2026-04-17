const { Kafka, logLevel } = require("kafkajs");

const kafka = new Kafka({
  clientId: "session-service",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(","),
  logLevel: logLevel.INFO,
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

const consumer = kafka.consumer({ groupId: "session-service-group" });

let isProducerConnected = false;
let isConsumerConnected = false;

// Producer functions
const connectProducer = async () => {
  if (!isProducerConnected) {
    try {
      // Set a timeout for Kafka connection - don't block server startup
      const connectPromise = producer.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Kafka connection timeout")), 5000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      isProducerConnected = true;
      console.log("✅ Kafka producer connected");
    } catch (error) {
      // Log error but don't throw - allow server to start without Kafka
      console.warn(
        "⚠️  Kafka producer not available (this is OK for local testing):",
        error.message
      );
      // Don't throw - just continue without Kafka
      isProducerConnected = false;
    }
  }
};

const disconnectProducer = async () => {
  if (isProducerConnected) {
    try {
      await producer.disconnect();
      isProducerConnected = false;
      console.log("✅ Kafka producer disconnected");
    } catch (error) {
      console.error("❌ Failed to disconnect Kafka producer:", error);
    }
  }
};

const publishEvent = async (topic, eventName, data) => {
  // If Kafka isn't connected, just log and return - don't crash
  if (!isProducerConnected) {
    console.log(
      `📝 Event logged (Kafka not available): ${eventName}`,
      data
    );
    return { eventName, timestamp: new Date().toISOString() };
  }

  try {
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      producer: "session-service",
      correlationId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    console.log(`✅ Event published: ${eventName} to topic: ${topic}`);
    return event;
  } catch (error) {
    // Log error but don't crash - Kafka issues shouldn't crash the server
    console.warn(`⚠️  Failed to publish event: ${eventName}`, error.message);
    return { eventName, timestamp: new Date().toISOString(), error: true };
  }
};

// Consumer functions
const connectConsumer = async () => {
  if (!isConsumerConnected) {
    try {
      await consumer.connect();
      isConsumerConnected = true;
      console.log("✅ Kafka consumer connected");
    } catch (error) {
      console.error("❌ Failed to connect Kafka consumer:", error);
      throw error;
    }
  }
};

const disconnectConsumer = async () => {
  if (isConsumerConnected) {
    try {
      await consumer.disconnect();
      isConsumerConnected = false;
      console.log("✅ Kafka consumer disconnected");
    } catch (error) {
      console.error("❌ Failed to disconnect Kafka consumer:", error);
    }
  }
};

const subscribeToEvents = async (topics, messageHandler) => {
  try {
    await connectConsumer();

    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`📨 Event received from ${topic}:`, event.eventName);
          await messageHandler(event);
        } catch (error) {
          console.error("❌ Error processing Kafka message:", error);
        }
      },
    });

    console.log(`✅ Subscribed to topics: ${topics.join(", ")}`);
  } catch (error) {
    console.error("❌ Failed to subscribe to events:", error);
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
