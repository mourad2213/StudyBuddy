const kafka = require('kafka-node');

const Producer = kafka.Producer;
const Consumer = kafka.Consumer;
const KafkaClient = kafka.KafkaClient;

let client;
let producer;

const initKafka = () => {
  client = new KafkaClient({
    kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
    connectTimeout: 10000,
    requestTimeout: 30000,
  });

  producer = new Producer(client, {
    requireAcks: 1,
    ackTimeoutMs: 100,
    partitionerType: 0,
  });

  producer.on('ready', () => {
    console.log('Kafka Producer Ready');
  });

  producer.on('error', (err) => {
    console.error('Kafka Producer Error:', err);
  });
};

const publishEvent = (eventType, data) => {
  if (!producer) {
    return Promise.resolve(null);
  }

  const message = {
    eventName: eventType,
    timestamp: new Date().toISOString(),
    producerService: 'availability-service',
    correlationId: data.userId || 'system',
    payload: data,
  };

  const payloads = [
    {
      topic: 'availability-events',
      messages: JSON.stringify(message),
    },
  ];

  return new Promise((resolve, reject) => {
    producer.send(payloads, (err, result) => {
      if (err) {
        console.error('Error publishing event:', err);
        resolve(null);
      } else {
        console.log('Event published:', eventType);
        resolve(result);
      }
    });
  });
};

const subscribeToEvents = (topics, callback) => {
  const consumer = new Consumer(client, [{ topic: topics, partition: 0 }], {
    autoCommit: true,
    fromOffset: true,
  });

  consumer.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.value);
      callback(parsedMessage);
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  consumer.on('error', (err) => {
    console.error('Kafka Consumer Error:', err);
  });

  return consumer;
};

const closeKafka = () => {
  if (client) {
    client.close();
  }
};

module.exports = {
  initKafka,
  publishEvent,
  subscribeToEvents,
  closeKafka,
};
