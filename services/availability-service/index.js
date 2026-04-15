require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const kafka = require('./kafka');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Kafka
kafka.initKafka();

// GraphQL Schema
const typeDefs = `
  type Availability {
    id: String!
    userId: String!
    dayOfWeek: Int!
    startTime: String!
    endTime: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getAvailability(userId: String!): [Availability!]!
    getAvailabilityByDay(userId: String!, dayOfWeek: Int!): [Availability!]!
    checkOverlap(userId: String!, dayOfWeek: Int!, startTime: String!, endTime: String!): Boolean!
  }

  type Mutation {
    createAvailability(
      userId: String!
      dayOfWeek: Int!
      startTime: String!
      endTime: String!
    ): Availability!
    
    updateAvailability(
      id: String!
      userId: String!
      dayOfWeek: Int!
      startTime: String!
      endTime: String!
    ): Availability!
    
    deleteAvailability(id: String!, userId: String!): Boolean!
  }
`;

// Helper function to check time overlap (HH:mm format)
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const isTimeOverlap = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

// Resolvers
const resolvers = {
  Query: {
    getAvailability: async (_, { userId }) => {
      try {
        return await prisma.availability.findMany({
          where: { userId },
          orderBy: { dayOfWeek: 'asc' },
        });
      } catch (err) {
        console.error('Error fetching availability:', err);
        throw new Error('Failed to fetch availability');
      }
    },

    getAvailabilityByDay: async (_, { userId, dayOfWeek }) => {
      try {
        return await prisma.availability.findMany({
          where: { userId, dayOfWeek },
          orderBy: { startTime: 'asc' },
        });
      } catch (err) {
        console.error('Error fetching availability by day:', err);
        throw new Error('Failed to fetch availability by day');
      }
    },

    checkOverlap: async (_, { userId, dayOfWeek, startTime, endTime }) => {
      try {
        const existing = await prisma.availability.findMany({
          where: { userId, dayOfWeek },
        });

        for (const slot of existing) {
          if (isTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
            return true;
          }
        }
        return false;
      } catch (err) {
        console.error('Error checking overlap:', err);
        throw new Error('Failed to check overlap');
      }
    },
  },

  Mutation: {
    createAvailability: async (
      _,
      { userId, dayOfWeek, startTime, endTime },
      context
    ) => {
      try {
        // Verify user is authenticated
        if (!context.userId) {
          throw new Error('Unauthorized');
        }

        // Validate dayOfWeek
        if (dayOfWeek < 0 || dayOfWeek > 6) {
          throw new Error('Invalid day of week (0-6)');
        }

        // Check for overlapping slots
        const existing = await prisma.availability.findMany({
          where: { userId, dayOfWeek },
        });

        for (const slot of existing) {
          if (isTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
            throw new Error('Time slot overlaps with existing availability');
          }
        }

        const availability = await prisma.availability.create({
          data: {
            userId,
            dayOfWeek,
            startTime,
            endTime,
          },
        });

        // Publish event to Kafka
        await kafka.publishEvent('AvailabilityCreated', {
          userId,
          availabilityId: availability.id,
          dayOfWeek,
          startTime,
          endTime,
        });

        return availability;
      } catch (err) {
        console.error('Error creating availability:', err);
        throw err;
      }
    },

    updateAvailability: async (
      _,
      { id, userId, dayOfWeek, startTime, endTime },
      context
    ) => {
      try {
        // Verify user is authenticated
        if (!context.userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const existing = await prisma.availability.findUnique({
          where: { id },
        });

        if (!existing || existing.userId !== userId) {
          throw new Error('Availability not found or unauthorized');
        }

        // Check for overlapping slots (excluding current slot)
        const overlapping = await prisma.availability.findMany({
          where: { userId, dayOfWeek, NOT: { id } },
        });

        for (const slot of overlapping) {
          if (isTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
            throw new Error('Time slot overlaps with existing availability');
          }
        }

        const updated = await prisma.availability.update({
          where: { id },
          data: {
            dayOfWeek,
            startTime,
            endTime,
          },
        });

        // Publish event to Kafka
        await kafka.publishEvent('AvailabilityUpdated', {
          userId,
          availabilityId: id,
          action: 'updated',
          dayOfWeek,
          startTime,
          endTime,
        });

        return updated;
      } catch (err) {
        console.error('Error updating availability:', err);
        throw err;
      }
    },

    deleteAvailability: async (_, { id, userId }, context) => {
      try {
        // Verify user is authenticated
        if (!context.userId) {
          throw new Error('Unauthorized');
        }

        // Verify ownership
        const existing = await prisma.availability.findUnique({
          where: { id },
        });

        if (!existing || existing.userId !== userId) {
          throw new Error('Availability not found or unauthorized');
        }

        await prisma.availability.delete({
          where: { id },
        });

        // Publish event to Kafka
        try {
        await kafka.publishEvent('AvailabilityDeleted', {
          userId,
          availabilityId: id,
        });
        } catch (e) {
        console.error("Kafka failed", e);
      }

        return true;
      } catch (err) {
        console.error('Error deleting availability:', err);
        throw err;
      }
    },
  },
};

// Context function to extract user info from JWT
const getContext = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      return { userId: decoded.userId };
    } catch (err) {
      console.error('Invalid token:', err);
    }
  }
  return {};
};

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start server
const startServer = async () => {
  try {
    await server.start();

    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => getContext(req),
      })
    );

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'availability-service' });
    });

    const PORT = process.env.PORT || 4002;
    app.listen(PORT, () => {
      console.log(`Availability Service running on http://localhost:${PORT}/graphql`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  kafka.closeKafka();
  process.exit(0);
});

startServer();
