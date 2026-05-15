import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// VALIDATE & CONFIGURE KAFKA
// ============================================
const validateKafkaConfig = () => {
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
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

if (brokers.length === 0) {
  throw new Error('No valid brokers found after parsing KAFKA_BROKERS');
}

const kafkaConfig = {
  clientId: 'matching-service',
  brokers,

  // Retry configuration
  retry: {
    initialRetryTime: 300,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
};

if (username && password) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: 'plain',
    username,
    password,
  };
}

const kafka = new Kafka(kafkaConfig);

// Declare BOTH before use — order matters
const consumer = kafka.consumer({ groupId: 'matching-service-group' });
const producer = kafka.producer();

export const MATCHING_EVENTS = {
  USER_PREFERENCES_UPDATED: 'UserPreferencesUpdated',
  AVAILABILITY_CREATED: 'AvailabilityCreated',
  AVAILABILITY_UPDATED: 'AvailabilityUpdated',
  AVAILABILITY_DELETED: 'AvailabilityDeleted',
  BUDDY_REQUEST_CREATED: 'BuddyRequestCreated',
  BUDDY_REQUEST_RESPONDED: 'BuddyRequestResponded',
  MATCH_FOUND: 'MatchFound',
  RECOMMENDATIONS_GENERATED: 'RecommendationsGenerated',
};

export const MATCHING_WEIGHTS = {
  SHARED_COURSES: 30,
  SHARED_TOPICS: 20,
  OVERLAPPING_AVAILABILITY: 25,
  PREFERENCES_MATCH: 15,
  STUDY_STYLE: 10,
};

// ============================================
// CONSUMER CONNECTION
// ============================================
export async function connectConsumer() {
  let retries = 10;

  while (retries > 0) {
    try {
      await consumer.connect();
      console.log('✅ Kafka consumer connected (matching-service)');
      return;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Consumer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error('❌ Consumer failed to connect to Kafka after retries');
        throw new Error('Failed to connect Kafka consumer');
      }
    }
  }
}

// ============================================
// PRODUCER CONNECTION
// ============================================
export async function connectProducer() {
  let retries = 10;

  while (retries > 0) {
    try {
      await producer.connect();
      console.log('✅ Kafka producer connected (matching-service)');
      return;
    } catch (err) {
      retries--;
      console.log(
        `⏳ Producer not ready, retrying in 5s... (${retries} retries left)`
      );
      console.error(err.message);
      await new Promise((res) => setTimeout(res, 5000));

      if (retries === 0) {
        console.error('❌ Producer failed to connect to Kafka after retries');
        throw new Error('Failed to connect Kafka producer');
      }
    }
  }
}

// ============================================
// DISCONNECTION
// ============================================
export async function disconnectConsumer() {
  try {
    await consumer.disconnect();
    console.log('✅ Kafka consumer disconnected');
  } catch (err) {
    console.error('Error disconnecting consumer:', err.message);
  }
}

export async function disconnectProducer() {
  try {
    await producer.disconnect();
    console.log('✅ Kafka producer disconnected');
  } catch (err) {
    console.error('Error disconnecting producer:', err.message);
  }
}

// ============================================
// SUBSCRIPTIONS
// ============================================
export async function subscribeToEvents() {
  const topics = [
    MATCHING_EVENTS.USER_PREFERENCES_UPDATED,
    MATCHING_EVENTS.AVAILABILITY_CREATED,
    MATCHING_EVENTS.AVAILABILITY_UPDATED,
    MATCHING_EVENTS.AVAILABILITY_DELETED,
    MATCHING_EVENTS.BUDDY_REQUEST_CREATED,
  ];

  for (const topic of topics) {
    let retries = 10;

    while (retries > 0) {
      try {
        await consumer.subscribe({
          topic,
          fromBeginning: false,
        });

        console.log(`Subscribed to topic: ${topic}`);
        break;
      } catch (error) {
        retries--;

        console.log(
          `Kafka topic ${topic} not ready yet. Retrying... (${retries} left)`
        );

        if (retries === 0) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  console.log("Matching service subscribed to events");
}

// ============================================
// CONSUME EVENTS
// ============================================
export async function consumeEvents(handler) {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || '{}');
        await handler(topic, event);
      } catch (err) {
        console.error('Error processing event:', err.message);
      }
    },
  });
}

// ============================================
// PRODUCE EVENTS
// ============================================
export async function produceRecommendationsEvent(recommendations, userId) {
  try {
    const event = {
      eventName: MATCHING_EVENTS.RECOMMENDATIONS_GENERATED,
      timestamp: new Date().toISOString(),
      producer: 'matching-service',
      correlationId: userId,
      payload: {
        userId,
        recommendations: recommendations.map(r => ({
          candidateId: r.candidateId,
          score: r.score,
          reasons: r.reasons,
        })),
      },
    };
    await producer.send({
      topic: MATCHING_EVENTS.RECOMMENDATIONS_GENERATED,
      messages: [
        {
          key: userId,
          value: JSON.stringify(event),
          headers: {
            'content-type': 'application/json',
            service: 'matching-service',
          },
        },
      ],
    });
    console.log('📤 Recommendations event produced:', userId);
  } catch (err) {
    console.error('Error producing recommendations event:', err.message);
    throw err;
  }
}

export async function produceEvent(topic, payload) {
  try {
    const event = {
      eventName: topic,
      timestamp: new Date().toISOString(),
      producer: 'matching-service',
      correlationId: payload.userId,
      payload,
    };
    await producer.send({
      topic,
      messages: [
        {
          key: payload.userId || 'matching-event',
          value: JSON.stringify(event),
          headers: {
            'content-type': 'application/json',
            service: 'matching-service',
          },
        },
      ],
    });
    console.log('📤 Event produced:', topic);
  } catch (err) {
    console.error('Error producing event:', err.message);
    throw err;
  }
}

export { kafka, consumer, producer };
