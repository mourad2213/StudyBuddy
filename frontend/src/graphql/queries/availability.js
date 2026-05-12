import { gql } from "@apollo/client";

export const GET_AVAILABILITY = gql`
  query GetAvailability($userId: String!) {
    getAvailability(userId: $userId) {
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

export const GET_AVAILABILITY_BY_DAY = gql`
  query GetAvailabilityByDay($userId: String!, $dayOfWeek: Int!) {
    getAvailabilityByDay(userId: $userId, dayOfWeek: $dayOfWeek) {
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