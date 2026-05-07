// test-notifications.js
// Place in project root and run: node test-notifications.js
// Keep docker compose running while you run this.

const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "test-producer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

async function send(topic, payload) {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
  console.log(`✅ Sent [${topic}] → ${payload.event || payload.eventName}`);
  await new Promise((r) => setTimeout(r, 800));
}

async function sendEvents() {
  await producer.connect();
  console.log("🔌 Connected to Kafka\n");

  // ─────────────────────────────────────────────
  // TOPIC: study-events  (session-service format)
  // notification-service reads event.event field
  // ─────────────────────────────────────────────

  await send("study-events", {
    event: "SESSION_CREATED",
    timestamp: new Date().toISOString(),
    payload: { userId: "test-user-1", sessionId: "session-abc" },
  });

  await send("study-events", {
    event: "SESSION_UPDATED",
    timestamp: new Date().toISOString(),
    payload: { userId: "test-user-2", sessionId: "session-abc" },
  });

  await send("study-events", {
    event: "SESSION_INVITATION_RECEIVED",
    timestamp: new Date().toISOString(),
    payload: { userId: "test-user-3", sessionId: "session-abc", hostUserId: "test-user-1" },
  });

//   await send("study-events", {
//     event: "SESSION_REMINDER",
//     timestamp: new Date().toISOString(),
//     payload: { userId: "test-user-4", sessionId: "session-abc" },
//   });

  // ─────────────────────────────────────────────
  // TOPIC: BuddyRequestCreated
  // matching-service format — uses eventName field
  // notification goes to toUserId
  // ─────────────────────────────────────────────

  await send("BuddyRequestCreated", {
    eventName: "BuddyRequestCreated",
    timestamp: new Date().toISOString(),
    producer: "test-producer",
    payload: {
      fromUserId: "test-user-1",
      toUserId: "test-user-5",
    },
  });

  // ─────────────────────────────────────────────
  // TOPIC: RecommendationsGenerated
  // matching-service format — uses eventName field
  // ─────────────────────────────────────────────

  await send("RecommendationsGenerated", {
    eventName: "RecommendationsGenerated",
    timestamp: new Date().toISOString(),
    producer: "test-producer",
    payload: {
      userId: "test-user-1",
      recommendations: [
        { candidateId: "test-user-6", score: 92, reasons: ["Same courses"] },
        { candidateId: "test-user-7", score: 85, reasons: ["Same topics"] },
      ],
    },
  });

  await producer.disconnect();
  console.log("\n🎉 All events sent!");
  console.log("\n📋 Expected notifications in DB:");
  console.log("  test-user-1 → SESSION_CREATED");
  console.log("  test-user-2 → SESSION_UPDATED");
  console.log("  test-user-3 → SESSION_INVITATION_RECEIVED");
  //console.log("  test-user-4 → SESSION_REMINDER (⚠️  not handled by notification-service yet — see note below)");
  console.log("  test-user-5 → BUDDY_REQUEST_RECEIVED");
  console.log("  test-user-1 → NEW_RECOMMENDATIONS (2 recommendations)");
}

sendEvents().catch(console.error);