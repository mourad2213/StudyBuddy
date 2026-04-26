# Messaging Service 🗨️

A real-time messaging service with WebSocket support and GraphQL API for the Study Buddy Matcher platform. Enables users to communicate in real-time through conversations.

## Features

- ✅ **Real-time WebSocket Communication** - Instant message delivery between users
- ✅ **GraphQL API** - Query and mutation support for messaging operations
- ✅ **Kafka Integration** - Event-driven architecture for service communication
- ✅ **Conversation Management** - Create and manage conversations between users
- ✅ **Message History** - Store and retrieve full conversation history
- ✅ **Read Receipts** - Track message read status
- ✅ **Typing Indicators** - Real-time typing status updates
- ✅ **PostgreSQL with Prisma ORM** - Scalable database management

## Architecture

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │
       ├─── GraphQL Queries/Mutations
       │    (REST API)
       │
       └─── WebSocket
            (Real-time)
            ↓
    ┌───────────────────┐
    │  Messaging Service│
    ├───────────────────┤
    │ • Express Server  │
    │ • Apollo GraphQL  │
    │ • WebSocket (ws)  │
    └────────┬──────────┘
             │
       ┌─────┴─────┐
       ↓           ↓
    ┌──────┐   ┌────────┐
    │Kafka │   │ Neon   │
    │Events│   │  DB    │
    └──────┘   └────────┘
```

## Database Schema

### Conversation
- `id`: Unique identifier (CUID)
- `participant1Id`: First user ID
- `participant2Id`: Second user ID
- `createdAt`: Conversation creation timestamp
- `updatedAt`: Last message timestamp
- One-to-many relationship with Message

### Message
- `id`: Unique identifier (CUID)
- `conversationId`: Reference to Conversation
- `senderId`: User who sent the message
- `senderName`: Optional sender name
- `content`: Message content
- `createdAt`: Message creation timestamp
- `isRead`: Read status
- `readAt`: When message was read

## API Reference

### GraphQL Queries

#### Get All Conversations
```graphql
query {
  getConversations(userId: "user123") {
    id
    participant1Id
    participant2Id
    lastMessage {
      content
      createdAt
    }
    unreadCount
  }
}
```

#### Get Conversation Messages
```graphql
query {
  getConversationMessages(conversationId: "conv123") {
    id
    senderId
    senderName
    content
    createdAt
    isRead
  }
}
```

#### Get Direct Conversation
```graphql
query {
  getDirectConversation(userId: "user123", otherUserId: "user456") {
    id
    messages {
      id
      content
      senderId
      createdAt
    }
  }
}
```

#### Get Unread Messages Count
```graphql
query {
  getUnreadMessagesCount(userId: "user123")
}
```

### GraphQL Mutations

#### Send Message
```graphql
mutation {
  sendMessage(
    conversationId: "conv123"
    senderId: "user123"
    senderName: "John Doe"
    content: "Hey, want to study together?"
  ) {
    id
    content
    createdAt
  }
}
```

#### Create Conversation
```graphql
mutation {
  createConversation(
    participant1Id: "user123"
    participant2Id: "user456"
  ) {
    id
    participant1Id
    participant2Id
  }
}
```

#### Mark Messages as Read
```graphql
mutation {
  markMessagesAsRead(
    conversationId: "conv123"
    userId: "user123"
  ) {
    id
    isRead
    readAt
  }
}
```

#### Delete Message
```graphql
mutation {
  deleteMessage(messageId: "msg123")
}
```

## WebSocket Protocol

### Connection & Authentication

**Client sends:**
```json
{
  "type": "authenticate",
  "userId": "user123"
}
```

**Server responds:**
```json
{
  "type": "authenticated",
  "userId": "user123",
  "message": "Connected successfully"
}
```

### Sending Messages

**Client sends:**
```json
{
  "type": "send_message",
  "userId": "user123",
  "conversationId": "conv123",
  "senderName": "John Doe",
  "content": "Hello!"
}
```

**Server broadcasts to all clients:**
```json
{
  "type": "new_message",
  "conversationId": "conv123",
  "senderId": "user123",
  "senderName": "John Doe",
  "content": "Hello!",
  "timestamp": "2026-04-24T10:30:00Z"
}
```

### Typing Indicators

**Client sends:**
```json
{
  "type": "typing",
  "userId": "user123",
  "conversationId": "conv123",
  "senderName": "John Doe"
}
```

**Server broadcasts:**
```json
{
  "type": "user_typing",
  "conversationId": "conv123",
  "userId": "user123",
  "senderName": "John Doe"
}
```

**Client sends:**
```json
{
  "type": "stop_typing",
  "userId": "user123",
  "conversationId": "conv123"
}
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/messaging_db"
DIRECT_URL="postgresql://user:password@localhost:5432/messaging_db"
MATCHING_DATABASE_URL="postgresql://user:password@localhost:5432/Matching_db"
KAFKA_BROKER="kafka:29092"
PORT=4004
JWT_SECRET="your_jwt_secret_key"
NODE_ENV="development"
```

## Setup & Installation

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Start the service:**
   ```bash
   node src/index.js
   ```

### Docker Deployment

1. **Build the image:**
   ```bash
   docker build -t messaging-service .
   ```

2. **Run the container:**
   ```bash
   docker run -p 4004:4004 \
     -e DATABASE_URL="postgresql://..." \
     -e KAFKA_BROKER="kafka:29092" \
     messaging-service
   ```

## Kafka Events

The service publishes and consumes the following events:

### Published Events
- `MessageSent` - When a message is sent
- `ConversationCreated` - When a new conversation is created
- `MessagesRead` - When messages are marked as read
- `MessageDeleted` - When a message is deleted

### Consumed Events
- `StudySessionCreated` - Notify users of session creation
- `MatchFound` - Notify matched users to start messaging
- `SessionJoined` - Notify about session participants

## Error Handling

All endpoints return error messages in the following format:

```json
{
  "type": "error",
  "message": "Detailed error message"
}
```

## Performance Considerations

- **Database Indexing**: Indexes on `conversationId`, `senderId`, and `createdAt` for fast queries
- **Pagination**: Consider implementing pagination for large conversation histories
- **Caching**: Messages can be cached in Redis for frequently accessed conversations
- **Connection Pooling**: WebSocket connections are efficiently managed in-memory

## Testing

Test the service using:

1. **Apollo Sandbox** - Access at `http://localhost:4008/graphql`
2. **WebSocket Client** - Use any WebSocket client library

Example WebSocket test:
```javascript
const ws = new WebSocket('ws://localhost:4004');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    userId: 'user123'
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Future Enhancements

- [ ] Message encryption (E2E)
- [ ] Voice/Video call integration
- [ ] File sharing support
- [ ] Message reactions/emojis
- [ ] Read receipts with timestamps
- [ ] Message search functionality
- [ ] Rate limiting for spam prevention
- [ ] Conversation archiving

## Support

For issues or questions, refer to the main project documentation.
