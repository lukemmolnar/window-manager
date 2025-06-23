// API configuration
const API_CONFIG = {
  // Use environment variable with fallback
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // Endpoints
  ENDPOINTS: {
    LOGIN: '/login',
    REGISTER: '/register',
    PROFILE: '/profile',
    LOGOUT: '/logout',
    ANNOUNCEMENT: '/announcement',
    // Chat endpoints
    CHAT_ROOMS: '/chat/rooms',
    CHAT_MESSAGES: '/chat/rooms/:id/messages',
    CHAT_JOIN: '/chat/rooms/:id/join',
    CHAT_DELETE_MESSAGE: '/chat/messages/:id',
    CHAT_DELETE_ROOM: '/chat/rooms/:id',
    // Voice chat endpoints
    VOICE_CHANNELS: '/chat/rooms/:id/voice-channels',
    VOICE_CHANNEL: '/chat/voice-channels/:id',
    VOICE_PARTICIPANTS: '/chat/voice-channels/:id/participants',
    VOICE_DELETE_CHANNEL: '/chat/voice-channels/:id',
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
    FILE_RENAME: '/files/rename',
    FILE_MOVE: '/files/move',
    // Public file endpoints
    PUBLIC_FILES_LIST: '/public-files',
    PUBLIC_FILE_CONTENT: '/public-files/content',
    // Storage endpoints
    STORAGE_STATS: '/files/storage',
    // Party endpoints
    PARTIES: '/parties',
    PARTIES_CURRENT: '/parties/current',
    PARTY_JOIN: '/parties/:id/join',
    PARTY_LEAVE: '/parties/:id/leave',
    // Tileset and marketplace endpoints
    TILESETS: '/tilesets',
    TILESET_BY_ID: '/tilesets/:id',
    TILESET_SELECT: '/tilesets/user/select/:id',
    TILESET_DESELECT: '/tilesets/user/select/:id',
    TILESET_SELECTED: '/tilesets/user/selected',
    TILESET_CHECK: '/tilesets/check/:id',
    TILESET_BY_CATEGORY: '/tilesets/category/:category',
    // Favorite tiles endpoints
    FAVORITE_TILES: '/favorite-tiles',
    FAVORITE_TILE_CHECK: '/favorite-tiles/check/:tileIndex/:tileType',
    FAVORITE_TILE_DELETE: '/favorite-tiles/:tileIndex/:tileType',
    // Party mode endpoints
    PARTY_MODE: '/party-mode',
    PARTY_MODE_TOGGLE: '/party-mode/toggle'
  }
};

export default API_CONFIG;
