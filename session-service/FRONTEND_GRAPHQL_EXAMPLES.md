# Frontend GraphQL Examples

Use these examples from the GraphQL Gateway or directly against this service while testing.

## Query: Get upcoming sessions

```graphql
query GetUpcomingSessions($userId: String!) {
  upcomingSessions(userId: $userId) {
    id
    topic
    sessionType
    location
    dateTime
    durationMins
    creatorId
    participants {
      userId
      role
      joinedAt
    }
  }
}
```

```json
{
  "userId": "user-123"
}
```

## Query: Get past sessions

```graphql
query GetPastSessions($userId: String!) {
  pastSessions(userId: $userId) {
    id
    topic
    sessionType
    location
    dateTime
    durationMins
    creatorId
    participants {
      userId
      role
      joinedAt
    }
  }
}
```

```json
{
  "userId": "user-123"
}
```

## Query: Get one session

```graphql
query GetSessionById($id: ID!) {
  sessionById(id: $id) {
    id
    topic
    sessionType
    location
    dateTime
    durationMins
    creatorId
    contactInfo
    participants {
      id
      userId
      role
    }
  }
}
```

## Mutation: Create study session

```graphql
mutation CreateStudySession($input: CreateStudySessionInput!) {
  createStudySession(input: $input) {
    id
    topic
    sessionType
    location
    creatorId
    participants {
      userId
      role
    }
  }
}
```

```json
{
  "input": {
    "topic": "Database Systems Midterm",
    "sessionType": "OFFLINE",
    "location": "GIU Library Room B12",
    "dateTime": "2026-04-15T18:00:00.000Z",
    "durationMins": 90,
    "creatorId": "user-123",
    "contactInfo": "user123@example.com"
  }
}
```

## Mutation: Join session

```graphql
mutation JoinSession($sessionId: ID!, $userId: String!) {
  joinSession(sessionId: $sessionId, userId: $userId) {
    id
    participants {
      userId
      role
    }
  }
}
```

## Mutation: Leave session

```graphql
mutation LeaveSession($sessionId: ID!, $userId: String!) {
  leaveSession(sessionId: $sessionId, userId: $userId) {
    id
    participants {
      userId
      role
    }
  }
}
```

## Mutation: Cancel session

```graphql
mutation CancelSession($id: ID!, $requesterId: String!) {
  cancelSession(id: $id, requesterId: $requesterId)
}
```
