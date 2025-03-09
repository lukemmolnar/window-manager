/**
 * IndexedDB configuration for the window manager
 */

const DB_NAME = 'WindowManagerDB';
const DB_VERSION = 1;
const STORES = {
  WORKSPACES: 'workspaces',
  WINDOW_STATES: 'windowStates'
};

export { DB_NAME, DB_VERSION, STORES };
