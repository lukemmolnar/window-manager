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
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
        db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
        console.log(`Created ${STORES.WORKSPACES} object store`);
      }
      
      if (!db.objectStoreNames.contains(STORES.WINDOW_STATES)) {
        db.createObjectStore(STORES.WINDOW_STATES, { keyPath: 'id' });
        console.log(`Created ${STORES.WINDOW_STATES} object store`);
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
    const request = indexedDB.open(DB_NAME);
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
};
