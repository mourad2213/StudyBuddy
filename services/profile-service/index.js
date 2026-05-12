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
        getAllProfiles: [Profile]  # Add this line
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

         getAllProfiles: async () => {
            return prisma.profile.findMany({
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
            const updated = await prisma.profile.upsert({
                where: { userId },
                update: data,
                create: { userId, ...data }
            });

            await sendEvent("ProfileUpdated", { userId, ...data });

            return updated;
        },

        addCourse: async (_, { profileId, name }) => {
            const course = await prisma.course.create({
                data: { profileId, name }
            });

            // Fetch complete user data
            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                include: {
                    courses: true,
                    topics: true,
                    preferences: true
                }
            });

            if (!profile) {
                throw new Error("Profile not found");
            }

            // Format data for matching service
            const userData = {
                userId: profile.userId,
                courses: profile.courses.map(c => c.name),
                topics: profile.topics.map(t => t.name),
                studyPace: profile.preferences?.pace,
                studyMode: profile.preferences?.mode,
                groupSize: profile.preferences?.groupSize,
                studyStyle: profile.preferences?.style,
            };

            await sendEvent("UserPreferencesUpdated", userData);

            return course;
        },

        updateCourse: async (_, { id, name }) => {
            const updated = await prisma.course.update({
                where: { id },
                data: { name },
                include: {
                    profile: {
                        include: {
                            courses: true,
                            topics: true,
                            preferences: true
                        }
                    }
                }
            });

            if (!updated.profile) {
                throw new Error("Profile not found");
            }

            // Format data for matching service
            const userData = {
                userId: updated.profile.userId,
                courses: updated.profile.courses.map(c => c.name),
                topics: updated.profile.topics.map(t => t.name),
                studyPace: updated.profile.preferences?.pace,
                studyMode: updated.profile.preferences?.mode,
                groupSize: updated.profile.preferences?.groupSize,
                studyStyle: updated.profile.preferences?.style,
            };

            await sendEvent("UserPreferencesUpdated", userData);

            return updated;
        },

        addTopic: async (_, { profileId, name }) => {
            const topic = await prisma.topic.create({
                data: { profileId, name }
            });

            // Fetch complete user data
            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                include: {
                    courses: true,
                    topics: true,
                    preferences: true
                }
            });

            if (!profile) {
                throw new Error("Profile not found");
            }

            // Format data for matching service
            const userData = {
                userId: profile.userId,
                courses: profile.courses.map(c => c.name),
                topics: profile.topics.map(t => t.name),
                studyPace: profile.preferences?.pace,
                studyMode: profile.preferences?.mode,
                groupSize: profile.preferences?.groupSize,
                studyStyle: profile.preferences?.style,
            };

            await sendEvent("UserPreferencesUpdated", userData);

            return topic;
        },

        setPreference: async (_, args) => {
            try {
                const pref = await prisma.preference.create({
                    data: args
                });

                // Fetch complete user data
                const profile = await prisma.profile.findUnique({
                    where: { id: args.profileId },
                    include: {
                        courses: true,
                        topics: true,
                        preferences: true
                    }
                });

                if (!profile) {
                    throw new Error("Profile not found");
                }

                // Format data for matching service
                const userData = {
                    userId: profile.userId,
                    courses: profile.courses.map(c => c.name),
                    topics: profile.topics.map(t => t.name),
                    studyPace: pref.pace,
                    studyMode: pref.mode,
                    groupSize: pref.groupSize,
                    studyStyle: pref.style,
                    // Note: availability comes from availability service
                };

                await sendEvent("UserPreferencesUpdated", userData);

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

            // Fetch complete user data
            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                include: {
                    courses: true,
                    topics: true,
                    preferences: true
                }
            });

            if (!profile) {
                throw new Error("Profile not found");
            }

            // Format data for matching service
            const userData = {
                userId: profile.userId,
                courses: profile.courses.map(c => c.name),
                topics: profile.topics.map(t => t.name),
                studyPace: updated.pace,
                studyMode: updated.mode,
                groupSize: updated.groupSize,
                studyStyle: updated.style,
                // Note: availability comes from availability service
            };

            await sendEvent("UserPreferencesUpdated", userData);

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