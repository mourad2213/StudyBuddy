# Software Project II
**TA. Menna Singergy | Spring 2026**

---

## 1. Project Overview

### 1.1 Description

The **Real-Time Study Buddy Matcher** is a full-stack, microservices-based system designed to help students find compatible study partners or groups based on shared academic interests, availability, and study preferences. Many students struggle to study effectively alone or to find peers who match their pace and schedule. This platform solves that problem by dynamically matching students using real-time data and event-driven communication through sessions created that can be either in-person (offline) or online. Offline sessions can be reserved in university study rooms.

**Main features:**

- User and Authentication Service
- Profile and Study Preferences Service
- Availability Management Service
- Matching Service
- Study Session Scheduling Service
- Notification Service
- Messaging / Chat Service *(Bonus Feature)*

### 1.2 Team Formation

The team should strictly consist of **5 members**.

### 1.3 Technology, Architecture and Stack

The system is built using a **microservices architecture**, where each service is independently developed and responsible for a specific business capability. Communication between services is handled asynchronously using **Kafka**, while a **GraphQL Gateway** provides a unified API for the frontend. Each service manages its own data using **NeonDB** (serverless PostgreSQL) and Kafka. Finally, the project will be deployed on **Docker** and on **Render/Railway**.

The system will be built using:

- **React** (Frontend)
- **Node.js** (Backend) with **GraphQL API (Apollo)**
- **NeonDB** (Serverless PostgreSQL) for database management
- **Prisma ORM** for seamless interactions

### 1.4 Structure

The project is divided into **three milestones**, covering UI design, backend development, and frontend integration and full project deployment.

---

## 2. Functional & Non-Functional Requirements

> **Note:** You can add additional FR and NFR if needed, but these are the essential ones.

### 2.1 User and Authentication Service

#### 2.1.1 Functional Requirements

- The system must allow users to register a new account using basic information such as name, email, and password.
- The system must allow users to log in using their email and password.
- The system must generate an authentication token (e.g., JWT) after successful login.
- The system must allow authenticated users to retrieve their profile information.
- The system must allow users to update their basic profile details.

#### 2.1.2 Non-Functional Requirements

- Passwords must be securely stored using hashing (e.g., bcrypt).
- Authentication tokens must be used to protect the GraphQL API.
- The service must ensure data privacy and prevent unauthorized access to user accounts.

---

### 2.2 Profile and Study Preferences Service

#### 2.2.1 Functional Requirements

- The system must allow users to add and update courses they are studying.
- The system must allow users to define study preferences, such as:
  1. Preferred study pace
  2. Preferred study mode (online or in-person)
  3. Preferred group size
  4. Preferred study style (e.g., writing notes, listening, discussing out loud, studying quietly, or other methods)
- The system must allow users to add study topics or subjects they need help with.
- The system must allow users to view and update their study preferences at any time.
- The service must publish an event to Kafka whenever preferences or courses are updated.

#### 2.2.2 Non-Functional Requirements

- User preference updates must be processed within **2 seconds**.
- The service must ensure that only the owner of the profile can modify their data.
- The service must be scalable to support multiple users updating preferences simultaneously.

---

### 2.3 Availability Management Service

#### 2.3.1 Functional Requirements

- The system must allow users to define their study availability during the week.
- The system must allow users to update or view their current availability schedule.
- The system must allow users to delete existing availability slots.
- The service must publish an event when availability is created or updated so that matching can be recalculated.
- The system must ensure users cannot create overlapping availability entries.

#### 2.3.2 Non-Functional Requirements

- The system must ensure data accuracy when storing time slots.
- The service must support simultaneous updates from multiple users without data corruption.

---

### 2.4 Matching Service

#### 2.4.1 Functional Requirements

- The system must analyze user information including:
  1. Courses
  2. Topics
  3. Availability
  4. Study preferences
- The system must generate recommended study buddies based on compatibility.
- The system must assign a compatibility score to potential matches.
- The system must allow users to view a list of recommended study partners.
- The service must publish an event when a match is identified.

#### 2.4.2 Non-Functional Requirements

- The matching process must return recommendations within **3 seconds**.
- The system must support multiple matching requests simultaneously.
- The service must ensure fair and consistent matching results based on available data.

---

### 2.5 Study Session Scheduling Service

#### 2.5.1 Functional Requirements

- The system must allow users to create a study session.
- The system must allow users to join existing sessions.
- The system must allow users to cancel or leave a session.
- The system must store session details including:
  1. Topic
  2. Date and time
  3. Duration
  4. Session type (online or in-person meeting)
  5. Contact info of the session creator and receiver (in case there is no messaging service)
- The system must notify other services when sessions are created or updated.

---

### 2.6 Notification Service

#### 2.6.1 Functional Requirements

- The system must notify users when important system events happen.
- Notifications must be created when:
  1. A match is found
  2. A study session is created
  3. A session invitation is received
- The system must allow users to view their notifications.
- The system must allow users to mark notifications as read.

---

### 2.7 Messaging / Chat Service *(Bonus Feature)*

#### 2.7.1 Functional Requirements

- The system must allow matched users to send messages to each other.
- The system must store a history of conversations.
- The system must allow users to view previous messages in a conversation.

---

### 2.8 Integration & Deployment

- The system shall be deployable on cloud platforms like Render, Railway, or Fly.io.
- The system shall integrate **Kafka** for real-time updates and async communication between services.
- **Docker** will be used for deploying the system.

> More details will be provided on what will exactly be deployed on Docker.

---

## 3. Milestone 1: UI/UX Design in Figma (30%)

### 3.1 Deadline

> Submission before **17/3/2026**

### 3.2 Objective

Design a user-friendly interface in Figma for the Study Buddy Matcher platform. The design should clearly demonstrate the interaction between different pages and UI components. The prototype must represent the complete user journey from registration to finding study buddies and organizing study sessions, ensuring all interactions between the pages/UI components are shown. The design must incorporate all UI principles covered in the labs.

### 3.3 Requirements

#### 3.3.1 Figma Design for Every Page

- **Landing / Welcome Page** — Introducing the platform, explaining its purpose, and allowing users to sign up or log in.
- **User Authentication** — Registration and login pages where students create accounts and access the system.
- **User Profile Setup** — A page where users enter their academic information such as university, academic year, courses, and study topics.
- **Study Preferences Setup** — Users should be able to specify how they prefer to study, including:
  - Preferred study pace
  - Preferred study mode (online or in-person)
  - Preferred group size
  - Preferred study style (writing, listening, quiet study, discussion, etc.)
- **Availability Management Page** — Users define the time slots during which they are available for study sessions.
- **Dashboard / Home Page** — A central page that summarizes the user's activity and provides access to main features such as:
  - Recommended study buddies
  - Upcoming study sessions
  - Notifications
  - Quick navigation to profile, matching, and sessions
- **Matching / Study Buddy Recommendation Page** — A page displaying suggested study partners based on shared courses, preferences, and availability.
- **Match Details Page** — A page showing detailed information about a potential study buddy, including shared courses, study preferences, and overlapping availability.
- **Buddy Requests / Connections Page** — A page where users can view incoming and outgoing study buddy requests and manage accepted study partners.
- **Study Sessions Page** — A page displaying upcoming and past study sessions that the user has created or joined.
- **Create Study Session Page** — A form allowing users to create new study sessions by selecting:
  - Topic
  - Date and time
  - Duration
  - Session type (online or in-person)
  - Participants
- **Notifications Page** — A page or dropdown panel showing notifications such as:
  - New match found
  - Buddy request received
  - Session invitation
  - Session reminder
- **Messaging / Chat Page** *(Optional Feature)* — A page allowing matched users to communicate and coordinate study sessions.
- **User Profile & Activity Page** — A page where users can view and edit their profile information, study preferences, and view their past sessions or connections.
- **Document stating what concepts you applied in each frame/page** — Students must provide a short document explaining the UI/UX concepts used in each screen, such as layout decisions, usability considerations, and interaction design.

### 3.4 Submission

The submission will be through a Google Form where you will send a Drive link that includes the Figma design/prototype.

---

## 4. Milestone 2: Backend Development & Service Integration (40%)

### 4.1 Deadline

> Submission before **10/4/2026**

### 4.2 Objective

This milestone focuses on building the backend with microservice-based architecture using Node.js where each service has its own DB set on NeonDB and Prisma. It also includes setting up Kafka for event-driven communication between services. The backend should expose a **GraphQL API** to allow the frontend to interact with the system efficiently.

### 4.3 Requirements

#### 4.3.1 Microservices-Based Backend

The backend system should follow a microservices architecture, where each service is responsible for a specific functionality of the platform. Services should communicate with each other through Kafka events and expose APIs accessible through the GraphQL Gateway.

**Services:**

- **User Service** — Manages user authentication and basic account information. Responsible for user registration, login, and account management. Stores essential user data such as name, email, university, and academic year. Generates authentication tokens (e.g., JWT). Also allows users to provide contact information (email/phone) for matched study buddies to communicate outside the platform if the optional Messaging Service is not implemented.

- **Profile & Preferences Service** — Manages the academic and study-related information of users. Allows users to define their courses, topics they need help with, and preferred study behavior (study pace, study mode, group size, study style).

- **Availability Service** — Allows users to define and manage their weekly study availability. Users can add, update, and remove time slots. Availability data is used by the matching service to determine overlapping free time.

- **Matching Service** — Generates study buddy recommendations by consuming events from other services. Compares users based on shared courses, shared topics, overlapping availability, study preferences, and study styles. Calculates a compatibility score using a rule-based scoring system (normalized to a value out of 100). Optionally returns short explanations describing why two users were matched.

- **Study Session Service** — Manages the creation and organization of study sessions. Users can create sessions (topic, date, time, duration, meeting type), join sessions created by others, and manage participant lists.

- **Notification Service** — Informs users about important events by listening to Kafka events generated by other services. Creates notifications for new matches, buddy requests, session invitations, and session reminders.

- **Messaging Service** *(Bonus)* — Enables communication between matched users or participants in the same session. Supports sending messages, storing conversation history, and retrieving previous messages. Messages are stored with sender ID, receiver/conversation ID, message content, and timestamp.
  > If this service is not implemented, users in the same session must be able to communicate using contact info.

#### 4.3.2 Database Setup (NeonDB + Prisma)

- PostgreSQL database with Prisma ORM.
- Schema definitions for users, rides, bookings, and payments (optional).
- Ride schema must enforce that all rides are either **TO** or **FROM** GIU.

#### 4.3.3 GraphQL API

Create a GraphQL gateway that exposes queries and mutations to interact with the system.

**Queries:**
- Retrieving user profiles
- Retrieving recommended study buddies
- Retrieving study sessions
- Retrieving notifications

**Mutations:**
- Updating user preferences
- Updating availability
- Sending buddy requests
- Creating study sessions
- Joining study sessions

> **Note:** GraphQL will also be implemented for the frontend (Apollo Client).

#### 4.3.4 Message Broker for Service Communication (Kafka)

Kafka is used as the message broker for event-driven communication between microservices. Instead of services calling each other directly, important system actions produce events that other services consume asynchronously.

**Typical events in the system:**

| Event | Description |
|---|---|
| `UserPreferencesUpdated` | Triggered when user preferences change |
| `AvailabilityUpdated` | Triggered when a user's availability changes |
| `BuddyRequestCreated` | Triggered when a buddy request is sent |
| `StudySessionCreated` | Triggered when a study session is created |
| `StudySessionJoined` | Triggered when a user joins a session |

**Example event flow:**
1. User updates availability → Availability Service publishes an event.
2. Matching Service consumes the event and recalculates possible matches.
3. A new match is generated → another event is produced.
4. Notification Service consumes the event and generates a user notification.

**Each event message should include:**
- Event name
- Timestamp
- Producer service
- Correlation ID
- Payload data

### 4.4 Submission

The submission will be through a Google Form where you will submit the backend of your system as a zip folder.

### 4.5 Evaluation

There will be an evaluation for this milestone where you will receive feedback about the project. You will reserve slots based on a **first-come, first-serve** basis.

---

## 5. Milestone 3: Frontend Implementation & Deployment (30%)

### 5.1 Deadline

> Submission before **12/5/2026**

### 5.2 Objective

This milestone focuses on implementing the UI design (from M1) in React, integrating it with the backend (from M2) using GraphQL client (Apollo), and deploying the complete system on Render/Railway and Docker.

### 5.3 Requirements

#### 5.3.1 Frontend Implementation in React

- Convert Figma designs (from M1) into code.
- Implement the pages and their functionalities.
- Optimize UI/UX for performance and responsiveness.

#### 5.3.2 Integration with Backend (Node.js)

- Connect React frontend with GraphQL API.
- Ensure proper state management and API communication.

#### 5.3.3 Deployment

- Deploy project on Render or Railway and Docker.
- Ensure the database (NeonDB) is accessible from deployed services.

> **Note:** You need to deploy your project on cloud platforms that support Docker.

#### 5.3.4 Evaluation

There will be a final evaluation for the whole project where you will demonstrate the full functionality of your system. Feedback from M2 should be taken into account.

---

## 6. Important Notes

> ⚠️ **AI-generated code is allowed, BUT you should understand the code. If not, a ZERO will be given for the whole project.**

- The suggested hosting and deployment sites are up to you. You can use whatever you prefer.
- This document might be updated; however, you will be informed whenever this happens.
- If you reached this far, congratulations! You are done with the first step towards completing this project 😄 Best of luck! I'm excited to see your creativity in action! You got this!
