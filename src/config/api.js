// API configuration
const API_CONFIG = {
  // Replace with your actual server URL
  BASE_URL: 'http://45.45.239.125:3001/api',
  
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
