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
    CHAT_JOIN: '/chat/rooms/:id/join',
    CHAT_DELETE_MESSAGE: '/chat/messages/:id',
    // Admin endpoints
    USERS: '/users',
    // Window state endpoints
    WINDOW_STATES: '/window-states',
    // Workspace endpoints
    WORKSPACES: '/workspaces'
  }
};

export default API_CONFIG;
