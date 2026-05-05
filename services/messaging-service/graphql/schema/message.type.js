import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type Message {
    id: String!
    conversationId: String!
    senderId: String!
    senderName: String
    content: String!
    createdAt: String!
    isRead: Boolean!
    readAt: String
  }

  type Conversation {
    id: String!
    participant1Id: String!
    participant2Id: String!
    createdAt: String!
    updatedAt: String!
    messages: [Message!]!
    unreadCount: Int!
    lastMessage: Message
  }

  type Query {
    getConversations(userId: String!): [Conversation!]!
    getConversationMessages(conversationId: String!): [Message!]!
    getDirectConversation(userId: String!, otherUserId: String!): Conversation
    getUnreadMessagesCount(userId: String!): Int!
  }

  type Mutation {
    sendMessage(
      conversationId: String!
      senderId: String!
      senderName: String
      content: String!
    ): Message!
    
    createConversation(participant1Id: String!, participant2Id: String!): Conversation!
    
    markMessagesAsRead(conversationId: String!, userId: String!): [Message!]!
    
    deleteMessage(messageId: String!): Boolean!
  }

`;
