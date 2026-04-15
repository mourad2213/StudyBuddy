const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { PrismaClient } = require('@prisma/client');
const { connectKafka, sendEvent } = require("./kafka");

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

const typeDefs = gql`
    type Course {
        id: ID!
        name: String!
    }

    type Topic {
        id: ID!
        name: String!
    }

    type Preference {
        id: ID!
        pace: String
        mode: String
        groupSize: Int
        style: String
    }

    type Profile {
        id: ID!
        userId: String!
        major: String
        academicYear: String
        bio: String
        courses: [Course]
        topics: [Topic]
        preferences: Preference
    }

    type Query {
        getProfile(userId: String!): Profile
        getCourses(profileId: String!): [Course]
        getTopics(profileId: String!): [Topic]
        getPreference(profileId: String!): Preference
    }

    type Mutation {
        createProfile(
            userId: String!
            major: String
            academicYear: String
            bio: String
        ): Profile

        updateProfile(
            userId: String!
            major: String
            academicYear: String
            bio: String
        ): Profile

        addCourse(profileId: String!, name: String!): Course

        updateCourse(id: ID!, name: String): Course

        addTopic(profileId: String!, name: String!): Topic

        setPreference(
            profileId: String!
            pace: String
            mode: String
            groupSize: Int
            style: String
        ): Preference

        updatePreference(
            profileId: String!
            pace: String
            mode: String
            groupSize: Int
            style: String
        ): Preference
    }
`;

const resolvers = {
    Query: {
        getProfile: async (_, { userId }) => {
            return prisma.profile.findUnique({
                where: { userId },
                include: {
                    courses: true,
                    topics: true,
                    preferences: true
                }
            });
        },

        getPreference: async (_, { profileId }) => {
            return prisma.preference.findUnique({
                where: { profileId }
            });
        },

        getCourses: async (_, { profileId }) => {
            return prisma.course.findMany({
                where: { profileId }
            });
        },

        getTopics: async (_, { profileId }) => {
            return prisma.topic.findMany({
                where: { profileId }
            });
        },
    },

    Mutation: {
        createProfile: async (_, args) => {
            return prisma.profile.create({
                data: args
            });
        },

        updateProfile: async (_, { userId, ...data }) => {
            const updated = await prisma.profile.update({
                where: { userId },
                data
            });

            await sendEvent("ProfileUpdated", { userId, ...data });

            return updated;
        },

        addCourse: async (_, { profileId, name }) => {
            const course = await prisma.course.create({
                data: { profileId, name }
            });

            const profile = await prisma.profile.findUnique({
                where: { id: profileId }
            });

            if (!profile) {
                throw new Error("Profile not found");
            }

            await sendEvent("CourseUpdated", {
                userId: profile.userId,
                profileId,
                name
            });

            return course;
        },

        updateCourse: async (_, { id, name }) => {
            const course = await prisma.course.findUnique({
                where: { id },
                include: { profile: true }
            });

            if (!course || !course.profile) {
                throw new Error("Course or profile not found");
            }

            const updated = await prisma.course.update({
                where: { id },
                data: { name }
            });

            await sendEvent("CourseUpdated", {
                userId: course.profile.userId,
                id,
                name
            });

            return updated;
        },

        addTopic: async (_, { profileId, name }) => {
            const topic = await prisma.topic.create({
                data: { profileId, name }
            });

            const profile = await prisma.profile.findUnique({
                where: { id: profileId }
            });

            if (!profile) {
                throw new Error("Profile not found");
            }

            await sendEvent("TopicUpdated", {
                userId: profile.userId,
                profileId,
                name
            });

            return topic;
        },

        setPreference: async (_, args) => {
            try {
                const pref = await prisma.preference.create({
                    data: args
                });

                const profile = await prisma.profile.findUnique({
                    where: { id: args.profileId }
                });

                if (!profile) {
                    throw new Error("Profile not found");
                }

                await sendEvent("UserPreferencesUpdated", {
                    userId: profile.userId,
                    ...pref
                });

                return pref;
            } catch (error) {
                if (error.code === "P2002") {
                    throw new Error("Preference already exists for this profile. Please use updatePreference instead.");
                }
                throw new Error("Failed to create preference");
            }
        },

        updatePreference: async (_, { profileId, ...data }) => {
            const updated = await prisma.preference.upsert({
                where: { profileId },
                update: data,
                create: { profileId, ...data }
            });

            const profile = await prisma.profile.findUnique({
                where: { id: profileId }
            });

            if (!profile) {
                throw new Error("Profile not found");
            }

            await sendEvent("UserPreferencesUpdated", {
                userId: profile.userId,
                profileId,
                ...data
            });

            return updated;
        }
    }
};

async function startServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers
    });

    await server.start();
    await connectKafka();

    server.applyMiddleware({ app });

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
        console.log(`🚀 GraphQL running at http://localhost:${PORT}/graphql`);
    });
}

startServer();