import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
  clientId: 'matching-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'matching-service-group' });

export const MATCHING_EVENTS = {
  USER_PREFERENCES_UPDATED: 'UserPreferencesUpdated',
  AVAILABILITY_CREATED: 'AvailabilityCreated',
  AVAILABILITY_UPDATED: 'AvailabilityUpdated',
  AVAILABILITY_DELETED: 'AvailabilityDeleted',
  BUDDY_REQUEST_CREATED: 'BuddyRequestCreated',
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

export async function connectConsumer() {
  await consumer.connect();
  console.log('Matching service Kafka consumer connected');
}

export async function subscribeToEvents() {
  await consumer.subscribe({ topic: MATCHING_EVENTS.USER_PREFERENCES_UPDATED, fromBeginning: false });
  await consumer.subscribe({ topic: MATCHING_EVENTS.AVAILABILITY_CREATED, fromBeginning: false });
  await consumer.subscribe({ topic: MATCHING_EVENTS.AVAILABILITY_UPDATED, fromBeginning: false });
  await consumer.subscribe({ topic: MATCHING_EVENTS.AVAILABILITY_DELETED, fromBeginning: false });
  await consumer.subscribe({ topic: MATCHING_EVENTS.BUDDY_REQUEST_CREATED, fromBeginning: false });
  console.log('Matching service subscribed to events');
}

export async function consumeEvents(handler) {
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value?.toString() || '{}');
      await handler(topic, event);
    },
  });
}

export async function produceRecommendationsEvent(recommendations, userId) {
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
    messages: [{ value: JSON.stringify(event) }],
  });
}

const producer = kafka.producer();

export async function connectProducer() {
  await producer.connect();
  console.log('Matching service Kafka producer connected');
}

export async function produceEvent(topic, payload) {
  const event = {
    eventName: topic,
    timestamp: new Date().toISOString(),
    producer: 'matching-service',
    correlationId: payload.userId,
    payload,
  };
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(event) }],
  });
}

export { kafka, consumer, producer };