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

// ========== Terminal State Functions ==========

/**
 * Save a terminal state to IndexedDB
 * @param {Object} terminalState - The terminal state to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveTerminalState = async (terminalState) => {
  await ensureDBInitialized();
  return saveData(STORES.TERMINAL_STATES, terminalState);
};

/**
 * Get a terminal state from IndexedDB
 * @param {string|number} id - The ID of the terminal state to retrieve
 * @returns {Promise<Object>} A promise that resolves to the terminal state
 */
export const getTerminalState = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.TERMINAL_STATES, id);
};

/**
 * Get all terminal states from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all terminal states
 */
export const getAllTerminalStates = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.TERMINAL_STATES);
};

/**
 * Delete a terminal state from IndexedDB
 * @param {string|number} id - The ID of the terminal state to delete
 * @returns {Promise<void>} A promise that resolves when the terminal state is deleted
 */
export const deleteTerminalState = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.TERMINAL_STATES, id);
};

// ========== Chat State Functions ==========

/**
 * Save a chat state to IndexedDB
 * @param {Object} chatState - The chat state to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveChatState = async (chatState) => {
  await ensureDBInitialized();
  return saveData(STORES.CHAT_STATES, chatState);
};

/**
 * Get a chat state from IndexedDB
 * @param {string|number} id - The ID of the chat state to retrieve
 * @returns {Promise<Object>} A promise that resolves to the chat state
 */
export const getChatState = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.CHAT_STATES, id);
};

/**
 * Get all chat states from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all chat states
 */
export const getAllChatStates = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.CHAT_STATES);
};

/**
 * Delete a chat state from IndexedDB
 * @param {string|number} id - The ID of the chat state to delete
 * @returns {Promise<void>} A promise that resolves when the chat state is deleted
 */
export const deleteChatState = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.CHAT_STATES, id);
};

// ========== Explorer State Functions ==========

/**
 * Save an explorer state to IndexedDB
 * @param {Object} explorerState - The explorer state to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveExplorerState = async (explorerState) => {
  await ensureDBInitialized();
  return saveData(STORES.EXPLORER_STATES, explorerState);
};

/**
 * Get an explorer state from IndexedDB
 * @param {string|number} id - The ID of the explorer state to retrieve
 * @returns {Promise<Object>} A promise that resolves to the explorer state
 */
export const getExplorerState = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.EXPLORER_STATES, id);
};

/**
 * Get all explorer states from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all explorer states
 */
export const getAllExplorerStates = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.EXPLORER_STATES);
};

/**
 * Delete an explorer state from IndexedDB
 * @param {string|number} id - The ID of the explorer state to delete
 * @returns {Promise<void>} A promise that resolves when the explorer state is deleted
 */
export const deleteExplorerState = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.EXPLORER_STATES, id);
};

// ========== Canvas State Functions ==========

/**
 * Save a canvas state to IndexedDB
 * @param {Object} canvasState - The canvas state to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveCanvasState = async (canvasState) => {
  await ensureDBInitialized();
  return saveData(STORES.CANVAS_STATES, canvasState);
};

/**
 * Get a canvas state from IndexedDB
 * @param {string|number} id - The ID of the canvas state to retrieve
 * @returns {Promise<Object>} A promise that resolves to the canvas state
 */
export const getCanvasState = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.CANVAS_STATES, id);
};

/**
 * Get all canvas states from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all canvas states
 */
export const getAllCanvasStates = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.CANVAS_STATES);
};

/**
 * Delete a canvas state from IndexedDB
 * @param {string|number} id - The ID of the canvas state to delete
 * @returns {Promise<void>} A promise that resolves when the canvas state is deleted
 */
export const deleteCanvasState = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.CANVAS_STATES, id);
};

// ========== Active Window Functions ==========

/**
 * Save an active window reference to IndexedDB
 * @param {Object} activeWindow - The active window reference to save
 * @returns {Promise<any>} A promise that resolves to the result of the operation
 */
export const saveActiveWindow = async (activeWindow) => {
  await ensureDBInitialized();
  return saveData(STORES.ACTIVE_WINDOWS, activeWindow);
};

/**
 * Get an active window reference from IndexedDB
 * @param {string|number} id - The ID of the active window reference to retrieve
 * @returns {Promise<Object>} A promise that resolves to the active window reference
 */
export const getActiveWindow = async (id) => {
  await ensureDBInitialized();
  return getData(STORES.ACTIVE_WINDOWS, id);
};

/**
 * Get all active window references from IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of all active window references
 */
export const getAllActiveWindows = async () => {
  await ensureDBInitialized();
  return getAllData(STORES.ACTIVE_WINDOWS);
};

/**
 * Delete an active window reference from IndexedDB
 * @param {string|number} id - The ID of the active window reference to delete
 * @returns {Promise<void>} A promise that resolves when the active window reference is deleted
 */
export const deleteActiveWindow = async (id) => {
  await ensureDBInitialized();
  return deleteData(STORES.ACTIVE_WINDOWS, id);
};
