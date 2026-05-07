// test-matching-notifications.js
// Place in project root and run: node test-matching-notifications.js
// This tests: UserPreferencesUpdated → matching → RecommendationsGenerated → notification

const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "test-matching",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

async function send(topic, payload) {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
  console.log(`✅ Published to [${topic}] for user: ${payload.payload?.userId}`);
  // Wait longer here — matching service needs time to generate recommendations
  await new Promise((r) => setTimeout(r, 3000));
}

async function main() {
  await producer.connect();
  console.log("🔌 Connected to Kafka\n");

  // Step 1: Cache user-A preferences
  // matching-service listens to UserPreferencesUpdated and caches this
  console.log("📤 Step 1: Publishing preferences for match-user-A...");
  await send("UserPreferencesUpdated", {
    eventName: "UserPreferencesUpdated",
    timestamp: new Date().toISOString(),
    producer: "test",
    payload: {
      userId: "match-user-A",
      courses: ["Math", "Physics"],
      topics: ["Calculus", "Mechanics"],
      studyPace: "FAST",
      studyMode: "ONLINE",
      groupSize: 3,
      studyStyle: "COLLABORATIVE",
        availability: [
            { day: "Monday", start: "09:00", end: "12:00" },
            { day: "Wednesday", start: "14:00", end: "17:00" }
            ],
    },
  });

  // Step 2: Cache user-B preferences (similar to A so they match)
  console.log("📤 Step 2: Publishing preferences for match-user-B...");
  await send("UserPreferencesUpdated", {
    eventName: "UserPreferencesUpdated",
    timestamp: new Date().toISOString(),
    producer: "test",
    payload: {
      userId: "match-user-B",
      courses: ["Math", "Chemistry"],
      topics: ["Calculus", "Organic Chemistry"],
      studyPace: "FAST",
      studyMode: "ONLINE",
      groupSize: 2,
      studyStyle: "COLLABORATIVE",
      availability: [
            { day: "Monday", start: "09:00", end: "12:00" },
            { day: "Wednesday", start: "14:00", end: "17:00" }
            ],
    },
  });

  // Step 3: Update user-A again — this time matching-service has BOTH users
  // cached, so it should generate recommendations and publish RecommendationsGenerated
  console.log("📤 Step 3: Re-publishing user-A to trigger matching with user-B...");
  await send("UserPreferencesUpdated", {
    eventName: "UserPreferencesUpdated",
    timestamp: new Date().toISOString(),
    producer: "test",
    payload: {
      userId: "match-user-A",
      courses: ["Math", "Physics"],
      topics: ["Calculus", "Mechanics"],
      studyPace: "FAST",
      studyMode: "ONLINE",
      groupSize: 3,
      studyStyle: "COLLABORATIVE",
        availability: [
            { day: "Monday", start: "09:00", end: "12:00" },
            { day: "Wednesday", start: "14:00", end: "17:00" }
            ],
    },
  });

  // Step 4: Test BuddyRequestCreated directly
  // This goes straight to notification-service (matching-service just logs it)
  console.log("📤 Step 4: Publishing BuddyRequestCreated...");
  await producer.send({
    topic: "BuddyRequestCreated",
    messages: [{
      value: JSON.stringify({
        eventName: "BuddyRequestCreated",
        timestamp: new Date().toISOString(),
        producer: "test",
        payload: {
          fromUserId: "match-user-A",
          toUserId: "match-user-B",
        },
      }),
    }],
  });
  console.log("✅ Published BuddyRequestCreated");

  await producer.disconnect();

  console.log("\n🎉 Done! Now check:");
  console.log("  1. matching-service logs → should show 'Processing preferences update for user: match-user-A/B'");
  console.log("  2. notification-service logs → should show RecommendationsGenerated + BuddyRequestCreated events");
  console.log("  3. Neon Notification_db → new rows for match-user-A (recommendations) and match-user-B (buddy request)");
  console.log("\n⚠️  If no RecommendationsGenerated appears, check matching-service logs for errors");
  console.log("    — the Matching_db may also need 'npx prisma db push' like session-service did");
}

main().catch(console.error);