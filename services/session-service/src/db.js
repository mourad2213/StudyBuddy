const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

// Test database connection on startup
async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Connection string:", process.env.DATABASE_URL?.replace(/:[^:]*@/, ":***@"));
    throw error;
  }
}

// Check if user is in the matching list by querying matching-service
async function isUserInMatchingList(creatorId, userId) {
  try {
    const matchingServiceUrl = process.env.MATCHING_SERVICE_URL || "http://matching-service:4004/graphql";
    
    const query = `
      query {
        getRecommendations(userId: "${creatorId}", limit: 100) {
          candidateId
          score
        }
      }
    `;

    const response = await fetch(matchingServiceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Matching service returned ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL errors from matching-service:", data.errors);
      throw new Error("Unable to verify matching list");
    }

    // Check if userId is in the recommendations
    const recommendations = data.data?.getRecommendations || [];
    return recommendations.some((rec) => rec.candidateId === userId);
  } catch (error) {
    console.error("Error checking matching list:", error);
    throw new Error("Unable to verify if user is in matching list. Please try again later.");
  }
}

module.exports = { prisma, testConnection, isUserInMatchingList };
