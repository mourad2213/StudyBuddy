# Availability Service

The Availability Service manages user study availability schedules in the Study Buddy platform. Users can define their weekly availability time slots, and the service ensures no overlapping slots exist on the same day.

## Features

- Create, read, update, and delete availability slots
- Automatic overlap detection and prevention
- Weekly recurring availability (Monday-Sunday)
- Kafka event publishing for availability changes
- GraphQL API for all operations
- JWT authentication for secure operations

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (NeonDB)
- Kafka broker running
- JWT_SECRET configured

### Installation

1. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

2. Update `.env` with your database and Kafka configuration:

```env
DATABASE_URL="postgresql://user:password@host:5432/availability_db"
KAFKA_HOST="kafka:9092"
JWT_SECRET="your-secret-key"
PORT=4002
```

3. Install dependencies:

```bash
npm install
```

4. Run Prisma migrations:

```bash
npx prisma migrate dev
```

5. Start the service:

```bash
npm start
```

For development with hot reload:

```bash
npm run dev
```

## GraphQL API

The service exposes a GraphQL endpoint at `/graphql`

### Authentication

All mutations require a JWT token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

### Queries

#### Get All Availability Slots for a User

```graphql
query {
  getAvailability(userId: "user-id-123") {
    id
    dayOfWeek
    startTime
    endTime
    createdAt
  }
}
```

#### Get Availability for a Specific Day

```graphql
query {
  getAvailabilityByDay(userId: "user-id-123", dayOfWeek: 0) {
    id
    dayOfWeek
    startTime
    endTime
  }
}
```

**Day of Week:** 0 = Monday, 1 = Tuesday, ..., 6 = Sunday

#### Check for Time Overlap

```graphql
query {
  checkOverlap(
    userId: "user-id-123"
    dayOfWeek: 0
    startTime: "09:00"
    endTime: "12:00"
  )
}
```

### Mutations

#### Create Availability Slot

```graphql
mutation {
  createAvailability(
    userId: "user-id-123"
    dayOfWeek: 0
    startTime: "09:00"
    endTime: "17:00"
  ) {
    id
    dayOfWeek
    startTime
    endTime
    createdAt
  }
}
```

**Returns:** New Availability object
**Publishes Event:** `AvailabilityUpdated` (action: "created")

#### Update Availability Slot

```graphql
mutation {
  updateAvailability(
    id: "availability-id"
    userId: "user-id-123"
    dayOfWeek: 1
    startTime: "10:00"
    endTime: "18:00"
  ) {
    id
    dayOfWeek
    startTime
    endTime
    updatedAt
  }
}
```

**Returns:** Updated Availability object
**Publishes Event:** `AvailabilityUpdated` (action: "updated")

#### Delete Availability Slot

```graphql
mutation {
  deleteAvailability(id: "availability-id", userId: "user-id-123")
}
```

**Returns:** Boolean (true if successful)
**Publishes Event:** `AvailabilityUpdated` (action: "deleted")

## Kafka Events

The service publishes events to the `availability-events` topic whenever availability is created, updated, or deleted.

### Event Format

```json
{
  "eventName": "AvailabilityUpdated",
  "timestamp": "2026-04-11T10:30:00.000Z",
  "producerService": "availability-service",
  "correlationId": "user-id-123",
  "payload": {
    "userId": "user-id-123",
    "availabilityId": "avail-id",
    "action": "created|updated|deleted",
    "dayOfWeek": 0,
    "startTime": "09:00",
    "endTime": "17:00"
  }
}
```

## Data Schema

### Availability Model

| Field     | Type     | Description                          |
|-----------|----------|--------------------------------------|
| id        | String   | Unique identifier (CUID)            |
| userId    | String   | Associated user ID                  |
| dayOfWeek | Int      | Day of week (0-6, Monday-Sunday)   |
| startTime | String   | Start time in HH:mm format          |
| endTime   | String   | End time in HH:mm format            |
| createdAt | DateTime | Record creation timestamp           |
| updatedAt | DateTime | Last update timestamp               |

## Error Handling

- **Invalid time slot overlap:** Returns error message "Time slot overlaps with existing availability"
- **Invalid day of week:** Returns error message "Invalid day of week (0-6)"
- **Unauthorized:** Returns error message "Unauthorized" if JWT token is missing or invalid
- **Not found:** Returns error message "Availability not found or unauthorized"

## Docker Deployment

Build the Docker image:

```bash
docker build -t availability-service .
```

Run the container:

```bash
docker run -e DATABASE_URL=<db_url> \
  -e KAFKA_HOST=kafka:9092 \
  -e JWT_SECRET=<secret> \
  -p 4002:4002 \
  availability-service
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` for automatic reload on file changes.

### Prisma Commands

```bash
# Open Prisma Studio
npx prisma studio

# Create migration
npx prisma migrate dev --name <name>

# Reset database
npx prisma migrate reset
```

## Health Check

The service provides a health endpoint at:

```
GET http://localhost:4002/health
```

Returns:

```json
{
  "status": "ok",
  "service": "availability-service"
}
```

## Notes

- Time slots are stored in HH:mm format (24-hour clock)
- Availability is weekly recurring (doesn't require specific dates)
- Overlapping time slots are detected and rejected with validation
- All database operations are async with proper error handling
- Kafka publishing happens after successful database operations
