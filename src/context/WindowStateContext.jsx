import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
  
  // Add a ref to track if we should update localStorage
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef(null);

  // Load initial state from localStorage once on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('windowStates');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (parsedState && parsedState.windowStates) {
          // Update the state ref directly
          stateRef.current = parsedState;
          // Force a re-render
          forceUpdate({});
        }
      }
      // Mark initial load as complete
      isInitialMount.current = false;
    } catch (error) {
      console.error('Failed to load window states from localStorage:', error);
      isInitialMount.current = false;
    }
  }, []); // Empty dependency array means this runs once on mount

  // Save to localStorage with debounce
  const saveToLocalStorage = useCallback(() => {
    // Skip saving on initial load
    if (isInitialMount.current) {
      return;
    }
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout to save the state after a delay
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('windowStates', JSON.stringify(stateRef.current));
      } catch (error) {
        console.error('Failed to save window states to localStorage:', error);
      }
    }, 500); // 500ms debounce
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
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Force a re-render
    forceUpdate({});
  }, [saveToLocalStorage]);

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
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Force a re-render
    forceUpdate({});
  }, [saveToLocalStorage]);

  const getWindowState = useCallback((windowId) => {
    return stateRef.current.windowStates[windowId] || null;
  }, []);

  // Create a stable context value
  const contextValue = useMemo(() => ({
    windowStates: stateRef.current.windowStates,
    setWindowState,
    removeWindowState,
    getWindowState
  }), [setWindowState, removeWindowState, getWindowState]);

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
