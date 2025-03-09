/**
 * Basic CRUD operations for IndexedDB
 */
import { getDB } from './db';

/**
 * Save data to a store
 * @param {string} storeName - The name of the object store
 * @param {Object} data - The data to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveData = async (storeName, data) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
    
    // Close the database when the transaction is complete
    transaction.oncomplete = () => db.close();
  });
};

/**
 * Get data from a store
 * @param {string} storeName - The name of the object store
 * @param {string|number} id - The ID of the data to retrieve
 * @returns {Promise<any>} A promise that resolves to the retrieved data
 */
export const getData = async (storeName, id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(request.result);
    
    // Close the database when the transaction is complete
    transaction.oncomplete = () => db.close();
  });
};

/**
 * Delete data from a store
 * @param {string} storeName - The name of the object store
 * @param {string|number} id - The ID of the data to delete
 * @returns {Promise<void>} A promise that resolves when the data is deleted
 */
export const deleteData = async (storeName, id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve();
    
    // Close the database when the transaction is complete
    transaction.oncomplete = () => db.close();
  });
};

/**
 * Get all data from a store
 * @param {string} storeName - The name of the object store
 * @returns {Promise<Array>} A promise that resolves to an array of all data in the store
 */
export const getAllData = async (storeName) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(request.result);
    
    // Close the database when the transaction is complete
    transaction.oncomplete = () => db.close();
  });
};

/**
 * Clear all data from a store
 * @param {string} storeName - The name of the object store
 * @returns {Promise<void>} A promise that resolves when the store is cleared
 */
export const clearStore = async (storeName) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve();
    
    // Close the database when the transaction is complete
    transaction.oncomplete = () => db.close();
  });
};
