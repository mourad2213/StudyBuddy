/**
 * Centralized API Configuration
 * All service URLs are configured here with environment variable fallbacks
 */

const API_CONFIG = {
  USER_SERVICE: import.meta.env.VITE_USER_URL || "http://localhost:4001/graphql",
  PROFILE_SERVICE: import.meta.env.VITE_PROFILE_URL || "http://localhost:4006/graphql",
  SESSION_SERVICE: import.meta.env.VITE_SESSION_URL || "http://localhost:4007/graphql",
  NOTIFICATION_SERVICE: import.meta.env.VITE_NOTIFICATION_URL || "http://localhost:4005/graphql",
  MATCHING_SERVICE: import.meta.env.VITE_MATCHING_URL || "http://localhost:4003/graphql",
  MESSAGING_SERVICE: import.meta.env.VITE_MESSAGING_URL || "http://localhost:4008/graphql",
  AVAILABILITY_SERVICE: import.meta.env.VITE_AVAILABILITY_URL || "http://localhost:4002/graphql",
};

export default API_CONFIG;
