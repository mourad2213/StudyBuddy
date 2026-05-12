import { gql } from "@apollo/client";

// Unrestricted user list for landing page buddy cards.
export const GET_ALL_USERS = gql`
  query GetAllUsers {
    getAllUsers {
      id
      name
      email
      university
      year
      createdAt
    }
  }
`;
