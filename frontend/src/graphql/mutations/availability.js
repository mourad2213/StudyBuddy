import { gql } from "@apollo/client";

export const CREATE_AVAILABILITY = gql`
  mutation CreateAvailability(
    $userId: String!
    $dayOfWeek: Int!
    $startTime: String!
    $endTime: String!
  ) {
    createAvailability(
      userId: $userId
      dayOfWeek: $dayOfWeek
      startTime: $startTime
      endTime: $endTime
    ) {
      id
      userId
      dayOfWeek
      startTime
      endTime
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_AVAILABILITY = gql`
  mutation UpdateAvailability(
    $id: String!
    $userId: String!
    $dayOfWeek: Int!
    $startTime: String!
    $endTime: String!
  ) {
    updateAvailability(
      id: $id
      userId: $userId
      dayOfWeek: $dayOfWeek
      startTime: $startTime
      endTime: $endTime
    ) {
      id
      userId
      dayOfWeek
      startTime
      endTime
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_AVAILABILITY = gql`
  mutation DeleteAvailability($id: String!, $userId: String!) {
    deleteAvailability(id: $id, userId: $userId)
  }
`;