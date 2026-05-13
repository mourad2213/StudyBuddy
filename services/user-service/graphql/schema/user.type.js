import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    university: String
    year: Int
    createdAt: String
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type Query {
    getMe: User
    # Unrestricted list of users for the public landing page.
    getAllUsers: [User!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthResponse
    login(email: String!, password: String!): AuthResponse
    updateUser(name: String, university: String, year: Int): User
  }
`;
