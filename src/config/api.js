// API configuration
const API_CONFIG = {
  // Use environment variable with fallback
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Endpoints
  ENDPOINTS: {
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
    ANNOUNCEMENT: '/announcement',
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
    WORKSPACES: '/workspaces',
    // File endpoints
    FILES_LIST: '/files',
    FILE_CONTENT: '/files/content',
    FILE_SAVE: '/files/content',
    FILE_CREATE: '/files/create',
    FILE_DELETE: '/files/delete',
    // Public file endpoints
    PUBLIC_FILES_LIST: '/public-files',
    PUBLIC_FILE_CONTENT: '/public-files/content'
  }
};

export default API_CONFIG;
