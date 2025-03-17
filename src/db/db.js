/**
 * IndexedDB initialization and core functionality
 */
import { DB_NAME, DB_VERSION, STORES } from './db-config';

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database instance
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('IndexedDB opened successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      console.log(`Upgrading IndexedDB from version ${oldVersion} to ${DB_VERSION}`);
      
      // Create object stores if they don't exist
      if (oldVersion < 1) {
        // Initial stores from version 1
        if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
          db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
          console.log(`Created ${STORES.WORKSPACES} object store`);
        }
        
        if (!db.objectStoreNames.contains(STORES.WINDOW_STATES)) {
          db.createObjectStore(STORES.WINDOW_STATES, { keyPath: 'id' });
          console.log(`Created ${STORES.WINDOW_STATES} object store`);
        }
      }
      
      if (oldVersion < 2) {
        // New stores added in version 2
        if (!db.objectStoreNames.contains(STORES.TERMINAL_STATES)) {
          db.createObjectStore(STORES.TERMINAL_STATES, { keyPath: 'id' });
          console.log(`Created ${STORES.TERMINAL_STATES} object store`);
        }
        
        if (!db.objectStoreNames.contains(STORES.CHAT_STATES)) {
          db.createObjectStore(STORES.CHAT_STATES, { keyPath: 'id' });
          console.log(`Created ${STORES.CHAT_STATES} object store`);
        }
        
        if (!db.objectStoreNames.contains(STORES.EXPLORER_STATES)) {
          db.createObjectStore(STORES.EXPLORER_STATES, { keyPath: 'id' });
          console.log(`Created ${STORES.EXPLORER_STATES} object store`);
        }
        
        if (!db.objectStoreNames.contains(STORES.ACTIVE_WINDOWS)) {
          db.createObjectStore(STORES.ACTIVE_WINDOWS, { keyPath: 'id' });
          console.log(`Created ${STORES.ACTIVE_WINDOWS} object store`);
        }
      }
      
      if (oldVersion < 3) {
        // New stores added in version 3
        if (!db.objectStoreNames.contains(STORES.CANVAS_STATES)) {
          db.createObjectStore(STORES.CANVAS_STATES, { keyPath: 'id' });
          console.log(`Created ${STORES.CANVAS_STATES} object store`);
        }
      }
    };
  });
};

/**
 * Get a database connection
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database instance
 */
export const getDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
};
