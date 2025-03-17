/**
 * IndexedDB configuration for the window manager
 */

const DB_NAME = 'WindowManagerDB';
const DB_VERSION = 3; // Increment version to trigger database upgrade
const STORES = {
  WORKSPACES: 'workspaces',
  WINDOW_STATES: 'windowStates',
  TERMINAL_STATES: 'terminalStates',
  CHAT_STATES: 'chatStates',
  EXPLORER_STATES: 'explorerStates',
  CANVAS_STATES: 'canvasStates', // Add canvas states store
  ACTIVE_WINDOWS: 'activeWindows'
};

export { DB_NAME, DB_VERSION, STORES };
