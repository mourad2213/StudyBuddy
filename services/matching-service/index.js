import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import dotenv from 'dotenv';
import { typeDefs } from './graphql/schema/type-defs.js';
import { resolvers } from './graphql/resolvers/match.resolver.js';
import {
  connectConsumer,
  subscribeToEvents,
  consumeEvents,
  connectProducer,
  MATCHING_EVENTS,
  produceRecommendationsEvent,
} from './kafka.js';
import { 
  prisma, 
  calculateCompatibility, 
  generateAndStoreRecommendations 
} from './matchingService.js';

dotenv.config();

const PORT = process.env.PORT || 4004;

async function cacheUserData(userId, data) {
  return prisma.cachedUserData.upsert({
    where: { id: userId },
    update: {
      courses: data.courses || [],
      topics: data.topics || [],
      studyPace: data.studyPace,
      studyMode: data.studyMode,
      groupSize: data.groupSize,
      studyStyle: data.studyStyle,
      availability: data.availability ?? [],
      lastUpdated: new Date(),
    },
    create: {
      id: userId,
      courses: data.courses || [],
      topics: data.topics || [],
      studyPace: data.studyPace,
      studyMode: data.studyMode,
      groupSize: data.groupSize,
      studyStyle: data.studyStyle,
      availability: data.availability ?? [],
    },
  });
}

async function handleEvent(topic, event) {
  const { payload } = event;

  switch (topic) {
    case MATCHING_EVENTS.USER_PREFERENCES_UPDATED:
      console.log(`Processing preferences update for user: ${payload.userId}`);
      await cacheUserData(payload.userId, {
        courses: payload.courses,
        topics: payload.topics,
        studyPace: payload.studyPace,
        studyMode: payload.studyMode,
        groupSize: payload.groupSize,
        studyStyle: payload.studyStyle,
        availability: payload.availability,
      });
      const recommendations = await generateAndStoreRecommendations(payload.userId);
      await produceRecommendationsEvent(recommendations, payload.userId);
      break;

    case MATCHING_EVENTS.AVAILABILITY_CREATED:
    case MATCHING_EVENTS.AVAILABILITY_UPDATED:
    case MATCHING_EVENTS.AVAILABILITY_DELETED:
      console.log(`Processing availability update for user: ${payload.userId}`);
      const existingUser = await prisma.cachedUserData.findUnique({
        where: { id: payload.userId },
      });
      
      if (existingUser) {
        const allAvailability = await prisma.availability.findMany({
          where: { userId: payload.userId },
        });
        
        const formattedAvailability = allAvailability.map(a => ({
          day: a.dayOfWeek,
          start: a.startTime,
          end: a.endTime,
        }));
        
        await cacheUserData(payload.userId, {
          ...existingUser,
          availability: formattedAvailability,
        });
        const availRecs = await generateAndStoreRecommendations(payload.userId);
        await produceRecommendationsEvent(availRecs, payload.userId);
      }
      break;

    case MATCHING_EVENTS.BUDDY_REQUEST_CREATED:
      console.log(`Processing buddy request: ${payload.fromUserId} -> ${payload.toUserId}`);
      break;

    default:
      console.log(`Unknown event: ${topic}`);
  }
}

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
  });

  console.log(`Matching service running at ${url}`);

  try {
    await connectConsumer();
    await connectProducer();
    await subscribeToEvents();
    await consumeEvents(handleEvent);

    console.log('Matching service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Kafka:', error);
    console.log('Matching service will run without Kafka events');
  }
}

startServer().catch(console.error);

process.on('SIGINT', async () => {
  console.log('Shutting down matching service...');
  await prisma.$disconnect();
  process.exit(0);
});