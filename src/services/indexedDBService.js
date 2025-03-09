/**
 * IndexedDB service for the window manager
 * Provides specific functions for working with workspaces and window states
 */
import { initDB } from '../db/db';
import { saveData, getData, getAllData, deleteData, clearStore } from '../db/db-operations';
import { STORES } from '../db/db-config';

// Initialize the database when the service is first imported
let dbInitialized = false;
const ensureDBInitialized = async () => {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
};

/**
 * Save a workspace to IndexedDB
 * @param {Object} workspace - The workspace to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveWorkspace = async (workspace) => {
  await ensureDBInitialized();
  return saveData(STORES.WORKSPACES, workspace);
};

/**
 * Get a workspace from IndexedDB
 * @param {string|number} id - The ID of the workspace to retrieve
 * @returns {Promise<Object>} A promise that resolves to the workspace
 */
export const getWorkspace = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.WORKSPACES, id);
};

/**
 * Get all workspaces from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all workspaces
 */
export const getAllWorkspaces = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.WORKSPACES);
};

/**
 * Delete a workspace from IndexedDB
 * @param {string|number} id - The ID of the workspace to delete
 * @returns {Promise<void>} A promise that resolves when the workspace is deleted
 */
export const deleteWorkspace = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.WORKSPACES, id);
};

/**
 * Save a window state to IndexedDB
 * @param {Object} windowState - The window state to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveWindowState = async (windowState) => {
  await ensureDBInitialized();
  return saveData(STORES.WINDOW_STATES, windowState);
};

/**
 * Get a window state from IndexedDB
 * @param {string|number} id - The ID of the window state to retrieve
 * @returns {Promise<Object>} A promise that resolves to the window state
 */
export const getWindowState = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.WINDOW_STATES, id);
};

/**
 * Get all window states from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all window states
 */
export const getAllWindowStates = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.WINDOW_STATES);
};

/**
 * Delete a window state from IndexedDB
 * @param {string|number} id - The ID of the window state to delete
 * @returns {Promise<void>} A promise that resolves when the window state is deleted
 */
export const deleteWindowState = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.WINDOW_STATES, id);
};

/**
 * Save all workspaces at once (for bulk operations)
 * @param {Array} workspaces - The workspaces to save
 * @returns {Promise<void>} A promise that resolves when all workspaces are saved
 */
export const saveAllWorkspaces = async (workspaces) => {
  await ensureDBInitialized();
  
  // Clear existing workspaces
  await clearStore(STORES.WORKSPACES);
  
  // Save each workspace
  for (const workspace of workspaces) {
    await saveWorkspace(workspace);
  }
};

/**
 * Save all window states at once (for bulk operations)
 * @param {Array} windowStates - The window states to save
 * @returns {Promise<void>} A promise that resolves when all window states are saved
 */
export const saveAllWindowStates = async (windowStates) => {
  await ensureDBInitialized();
  
  // Clear existing window states
  await clearStore(STORES.WINDOW_STATES);
  
  // Save each window state
  for (const state of windowStates) {
    await saveWindowState(state);
  }
};
