import { gql } from "@apollo/client";

// Profile data used to populate buddy cards on landing page.
export const GET_ALL_PROFILES = gql`
  query GetAllProfiles {
    getAllProfiles {
      id
      userId
      major
      academicYear
      courses {
        id
        name
      }
      preferences {
        id
        style
      }
    }
  }
`;

// Single profile lookup for the match details page.
export const GET_PROFILE = gql`
  query GetProfile($userId: String!) {
    getProfile(userId: $userId) {
      id
      userId
      major
      academicYear
      bio
      courses {
        id
        name
      }
      preferences {
        id
        pace
        mode
        groupSize
        style
      }
    }
  }
`;
