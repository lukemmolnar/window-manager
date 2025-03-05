// API configuration
const API_CONFIG = {
  // Use environment variable with fallback
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Endpoints
  ENDPOINTS: {
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
    // Chat endpoints
    CHAT_ROOMS: '/chat/rooms',
    CHAT_MESSAGES: '/chat/rooms/:id/messages',
    CHAT_JOIN: '/chat/rooms/:id/join'
  }
};

export default API_CONFIG;