import { gql } from "@apollo/client";

export const RESPOND_TO_SESSION_INVITATION = gql`
  mutation RespondToSessionInvitation(
    $sessionId: ID!
    $userId: String!
    $status: ParticipantStatus!
  ) {
    respondToSessionInvitation(
      sessionId: $sessionId
      userId: $userId
      status: $status
    ) {
      id
      userId
      role
      inviteStatus
      joinedAt
    }
  }
`;
