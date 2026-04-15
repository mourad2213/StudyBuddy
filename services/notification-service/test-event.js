const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "test-producer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

async function sendEvents() {
  await producer.connect();

  const events = [
    {
    event: "MATCH_FOUND",
    timestamp: new Date().toISOString(),
    service: "test-producer",
    payload: {
        userId: "123",
    },
    },
    {
    event: "SESSION_CREATED",
    timestamp: new Date().toISOString(),
    service: "test-producer",
    payload: {
        userId: "123",
    },
    },
    {
      event: "SESSION_INVITATION_RECEIVED",
      timestamp: new Date().toISOString(),
      service: "test-producer",
      payload: {
        userId: "123",
      },
    },
    {
      
      event: "BUDDY_REQUEST_RECEIVED",
      timestamp: new Date().toISOString(),
      service: "test-producer",
      payload: {
        userId: "123",
      },
    },
    {
      event: "SESSION_REMINDER",
      timestamp: new Date().toISOString(),
      service: "test-producer",
      payload: {
        userId: "123",
      },
    },
  ];

  for (const e of events) {
    await producer.send({
      topic: "study-events",
      messages: [
        {
          value: JSON.stringify(e),
        },
      ],
    });

    console.log(`Sent: ${e.event} ✅`);
  }

  await producer.disconnect();
  console.log("All events sent 🎉");
}

sendEvents().catch(console.error);