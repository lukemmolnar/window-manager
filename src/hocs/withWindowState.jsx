import React, { useCallback, useMemo } from 'react';
import { useWindowState } from '../context/WindowStateContext';

/**
 * Higher-Order Component that adds state management capabilities to window components.
 * This HOC provides a standardized way to manage window state across different window types.
 *
 * @param {React.Component} WrappedComponent - The window component to enhance with state management
 * @param {string} windowType - The type of window from WINDOW_TYPES
 * @returns {React.Component} - A new component with state management capabilities
 */
const withWindowState = (WrappedComponent, windowType) => {
  return function WithWindowState({ 
    nodeId,
    ...props
  }) {
    // Access the window state context
    const { getWindowState, setWindowState } = useWindowState();
    
    // Get the current state or use an empty object if none exists
    // Use useMemo to avoid recreating the object on every render
    const currentState = useMemo(() => {
      return getWindowState(nodeId)?.content || {};
    }, [getWindowState, nodeId]);
    
    // Create an updater function for the component to use
    // Use useCallback to avoid recreating the function on every render
    const updateWindowState = useCallback((updates) => {
      // Get the latest state to ensure we're working with current data
      const latestState = getWindowState(nodeId)?.content || {};
      
      // Allow both object and function updaters
      const newContent = typeof updates === 'function'
        ? updates(latestState)
        : { ...latestState, ...updates };
        
      setWindowState(nodeId, windowType, newContent);
    }, [getWindowState, setWindowState, nodeId, windowType]);
    
    return (
      <WrappedComponent
        {...props}
        nodeId={nodeId}
        windowState={currentState}
        updateWindowState={updateWindowState}
      />
    );
  };
};

export default withWindowState;
