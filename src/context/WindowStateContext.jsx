import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { WINDOW_TYPES } from '../utils/windowTypes';
import {
  saveWindowState as saveWindowStateToIndexedDB,
  getWindowState as getWindowStateFromIndexedDB,
  getAllWindowStates as getAllWindowStatesFromIndexedDB,
  deleteWindowState as deleteWindowStateFromIndexedDB,
  saveTerminalState,
  getTerminalState,
  saveChatState,
  getChatState,
  saveExplorerState,
  getExplorerState,
  saveActiveWindow,
  getActiveWindow as getActiveWindowFromIndexedDB,
  deleteActiveWindow
} from '../services/indexedDBService';

// Create context
const WindowStateContext = createContext();

// Initial state with different content types
const initialState = {
  windowStates: {}
};

// Context provider component
export function WindowStateProvider({ children }) {
  // Use a ref to store the state to avoid re-renders
  const stateRef = useRef(initialState);
  
  // Use useState just to trigger re-renders when needed
  const [, forceUpdate] = useState({});
  
  // Add a ref to track if we should update API
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef(null);
  const indexedDBTimeoutRef = useRef(null);

  // Load initial state from IndexedDB and API once on mount
  useEffect(() => {
    const loadWindowStates = async () => {
      try {
        console.log('Loading window states from IndexedDB and API...');
        
        // First try to load from IndexedDB (works even when offline)
        const indexedDBStates = await getAllWindowStatesFromIndexedDB();
        if (indexedDBStates && indexedDBStates.length > 0) {
          console.log('Loaded window states from IndexedDB:', indexedDBStates);
          
          // Convert array to object with windowId as key
          const windowStatesObj = {};
          indexedDBStates.forEach(state => {
            windowStatesObj[state.id] = {
              type: state.type,
              content: state.content
            };
          });
          
          // Update the state ref
          stateRef.current = {
            windowStates: windowStatesObj
          };
          
          // Force a re-render
          forceUpdate({});
        }
        
        // Then try to load from API (if authenticated)
        const token = localStorage.getItem('auth_token');
        if (!token) {
          isInitialMount.current = false;
          return; // No token, use IndexedDB state
        }
        
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WINDOW_STATES}`, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.windowStates) {
          console.log('Loaded window states from API:', response.data.windowStates);
          
          // Update the state ref directly
          stateRef.current = {
            windowStates: response.data.windowStates
          };
          
          // Force a re-render
          forceUpdate({});
          
          // Also update IndexedDB with the API data
          Object.entries(response.data.windowStates).forEach(([windowId, state]) => {
            saveWindowStateToIndexedDB({
              id: windowId,
              type: state.type,
              content: state.content
            });
            
            // Also save to type-specific stores
            saveTypeSpecificState(windowId, state.type, state.content);
          });
        }
      } catch (error) {
        console.error('Failed to load window states:', error);
      } finally {
        // Mark initial load as complete
        isInitialMount.current = false;
      }
    };
    
    loadWindowStates();
  }, []); // Empty dependency array means this runs once on mount

  // Helper function to save state to type-specific IndexedDB stores
  const saveTypeSpecificState = useCallback(async (windowId, windowType, content) => {
    try {
      switch (windowType) {
        case WINDOW_TYPES.TERMINAL:
          await saveTerminalState({
            id: windowId,
            content
          });
          break;
        case WINDOW_TYPES.CHAT:
          await saveChatState({
            id: windowId,
            content
          });
          break;
        case WINDOW_TYPES.EXPLORER:
          await saveExplorerState({
            id: windowId,
            content
          });
          break;
        default:
          // No type-specific handling needed
          break;
      }
    } catch (error) {
      console.error(`Failed to save ${windowType} state to IndexedDB:`, error);
    }
  }, []);

  // Save to IndexedDB with debounce
  const saveToIndexedDB = useCallback((windowId, windowType, content) => {
    // Clear any existing timeout
    if (indexedDBTimeoutRef.current) {
      clearTimeout(indexedDBTimeoutRef.current);
    }
    
    // Set a new timeout to save the state after a delay
    indexedDBTimeoutRef.current = setTimeout(async () => {
      try {
        // Save to general window states store
        await saveWindowStateToIndexedDB({
          id: windowId,
          type: windowType,
          content
        });
        
        // Save to type-specific store
        await saveTypeSpecificState(windowId, windowType, content);
        
        console.log(`Saved ${windowType} state to IndexedDB for window ${windowId}`);
      } catch (error) {
        console.error('Failed to save window state to IndexedDB:', error);
      }
    }, 300); // 300ms debounce
  }, [saveTypeSpecificState]);

  // Save to API with debounce
const saveToAPI = useCallback(() => {
  // Skip saving on initial load
  if (isInitialMount.current) {
    return;
  }
  
  // Clear any existing timeout
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  
  // Set a new timeout to save the state after a delay
  saveTimeoutRef.current = setTimeout(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return; // No token, don't save to API
      
      // ADD THIS DEBUG LINE
      console.log('[DEBUG] Sending to API:', stateRef.current.windowStates);
      
      await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WINDOW_STATES}`, 
        { windowStates: stateRef.current.windowStates },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Saved window states to API');
    } catch (error) {
      console.error('Failed to save window states to API:', error);
    }
  }, 500); // 500ms debounce
}, []);

  // Clear window states (used during logout)
  const clearWindowStates = useCallback(() => {
    stateRef.current = initialState;
    forceUpdate({});
  }, []);

  // Reload window states from API (used after login)
  const reloadWindowStates = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return; // No token, use default empty state
      }
      
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WINDOW_STATES}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.windowStates) {
        // Update the state ref directly
        stateRef.current = {
          windowStates: response.data.windowStates
        };
        
        // Force a re-render
        forceUpdate({});
        
        // Also update IndexedDB with the API data
        Object.entries(response.data.windowStates).forEach(([windowId, state]) => {
          saveWindowStateToIndexedDB({
            id: windowId,
            type: state.type,
            content: state.content
          });
          
          // Also save to type-specific stores
          saveTypeSpecificState(windowId, state.type, state.content);
        });
        
        console.log('Window states reloaded after login');
      }
    } catch (error) {
      console.error('Failed to reload window states from API:', error);
    }
  }, [saveTypeSpecificState]);

  // Action creators
  const setWindowState = useCallback((windowId, windowType, content) => {
    // Update the state ref directly
    stateRef.current = {
      ...stateRef.current,
      windowStates: {
        ...stateRef.current.windowStates,
        [windowId]: {
          type: windowType,
          content
        }
      }
    };
    
    // Save to IndexedDB
    saveToIndexedDB(windowId, windowType, content);
    
    // Save to API
    saveToAPI();
    
    // Force a re-render
    forceUpdate({});
  }, [saveToAPI, saveToIndexedDB]);

  const removeWindowState = useCallback((windowId) => {
    // Create a new state object
    const newState = {
      ...stateRef.current,
      windowStates: { ...stateRef.current.windowStates }
    };
    
    // Get the window type before deleting
    const windowType = newState.windowStates[windowId]?.type;
    
    // Delete the window state
    delete newState.windowStates[windowId];
    
    // Update the state ref
    stateRef.current = newState;
    
    // Delete from IndexedDB
    deleteWindowStateFromIndexedDB(windowId);
    
    // Delete active window reference if it exists
    deleteActiveWindow(windowId);
    
    // Save to API
    saveToAPI();
    
    // Force a re-render
    forceUpdate({});
    
    console.log(`Removed window state for window ${windowId}`);
  }, [saveToAPI]);

  const getWindowState = useCallback(async (windowId) => {
    // First check in-memory state
    const memoryState = stateRef.current.windowStates[windowId];
    if (memoryState) {
      return memoryState;
    }
    
    // If not in memory, try to get from IndexedDB
    try {
      const dbState = await getWindowStateFromIndexedDB(windowId);
      if (dbState) {
        // Update in-memory state
        stateRef.current = {
          ...stateRef.current,
          windowStates: {
            ...stateRef.current.windowStates,
            [windowId]: {
              type: dbState.type,
              content: dbState.content
            }
          }
        };
        
        // Force a re-render
        forceUpdate({});
        
        return {
          type: dbState.type,
          content: dbState.content
        };
      }
    } catch (error) {
      console.error(`Failed to get window state for window ${windowId} from IndexedDB:`, error);
    }
    
    return null;
  }, []);

  // Function to save active window reference
  const setActiveWindow = useCallback(async (windowId, windowType) => {
    try {
      await saveActiveWindow({
        id: windowType,
        activeWindowId: windowId
      });
      
      console.log(`Saved active window reference for ${windowType}: ${windowId}`);
    } catch (error) {
      console.error(`Failed to save active window reference for ${windowType}:`, error);
    }
  }, []);

  // Function to get active window reference
  const getActiveWindow = useCallback(async (windowType) => {
    try {
      const activeWindow = await getActiveWindowFromIndexedDB(windowType);
      return activeWindow?.activeWindowId || null;
    } catch (error) {
      console.error(`Failed to get active window reference for ${windowType}:`, error);
      return null;
    }
  }, []);

  // Create a stable context value
  const contextValue = useMemo(() => ({
    windowStates: stateRef.current.windowStates,
    setWindowState,
    removeWindowState,
    getWindowState,
    clearWindowStates,
    reloadWindowStates,
    setActiveWindow,
    getActiveWindow
  }), [
    setWindowState, 
    removeWindowState, 
    getWindowState, 
    clearWindowStates, 
    reloadWindowStates,
    setActiveWindow,
    getActiveWindow
  ]);

  return (
    <WindowStateContext.Provider value={contextValue}>
      {children}
    </WindowStateContext.Provider>
  );
}

// Custom hook to use the window state context
export function useWindowState() {
  const context = useContext(WindowStateContext);
  if (!context) {
    throw new Error('useWindowState must be used within a WindowStateProvider');
  }
  return context;
}
