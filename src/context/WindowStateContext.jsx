import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

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

  // Load initial state from API once on mount
  useEffect(() => {
    const fetchWindowStates = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          isInitialMount.current = false;
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
        }
        
        // Mark initial load as complete
        isInitialMount.current = false;
      } catch (error) {
        console.error('Failed to load window states from API:', error);
        isInitialMount.current = false;
      }
    };
    
    fetchWindowStates();
  }, []); // Empty dependency array means this runs once on mount

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
        if (!token) return; // No token, don't save
        
        await axios.post(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WINDOW_STATES}`, 
          { windowStates: stateRef.current.windowStates },
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
    
    // Save to API
    saveToAPI();
    
    // Force a re-render
    forceUpdate({});
  }, [saveToAPI]);

  const removeWindowState = useCallback((windowId) => {
    // Create a new state object
    const newState = {
      ...stateRef.current,
      windowStates: { ...stateRef.current.windowStates }
    };
    
    // Delete the window state
    delete newState.windowStates[windowId];
    
    // Update the state ref
    stateRef.current = newState;
    
    // Save to API
    saveToAPI();
    
    // Force a re-render
    forceUpdate({});
  }, [saveToAPI]);

  const getWindowState = useCallback((windowId) => {
    return stateRef.current.windowStates[windowId] || null;
  }, []);

  // Create a stable context value
  const contextValue = useMemo(() => ({
    windowStates: stateRef.current.windowStates,
    setWindowState,
    removeWindowState,
    getWindowState,
    clearWindowStates
  }), [setWindowState, removeWindowState, getWindowState, clearWindowStates]);

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
