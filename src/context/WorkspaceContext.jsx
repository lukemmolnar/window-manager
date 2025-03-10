import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

// Create context
const WorkspaceContext = createContext();

// Initial workspaces
const initialWorkspaces = [
  { id: 1, name: 'Main', root: null, activeNodeId: null, terminalStates: {} },
  { id: 2, name: 'Code', root: null, activeNodeId: null, terminalStates: {} },
  { id: 3, name: 'Terminal', root: null, activeNodeId: null, terminalStates: {} },
  { id: 4, name: 'Preview', root: null, activeNodeId: null, terminalStates: {} }
];

/**
 * WorkspaceProvider component for managing workspace state
 * This handles the persistence of window layouts across page refreshes
 */
export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [currentWorkspaceIndex, setCurrentWorkspaceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to load workspaces from server
  const loadWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get auth token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('No auth token found, using initial workspaces');
        setIsLoading(false);
        return;
      }
      
      // Fetch workspaces from server
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WORKSPACES}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.workspaces) {
        console.log('Loaded workspaces from server:', response.data.workspaces);
        setWorkspaces(response.data.workspaces);
      } else {
        console.log('No saved workspaces found, using initial workspaces');
      }
    } catch (error) {
      console.error('Failed to load workspaces from server:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load workspaces from server API on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);
  
  // Save workspaces to server API whenever they change
  useEffect(() => {
    if (isLoading) return; // Skip saving during initial load
    
    const saveWorkspaces = async () => {
      try {
        // Get auth token
        const token = localStorage.getItem('auth_token');
        if (!token) return; // Don't save if not authenticated
        
        // Ensure we're only saving the array of workspaces
        // Create a clean copy without any non-array properties
        const workspacesToSave = [...workspaces].map(workspace => ({
          id: workspace.id,
          name: workspace.name,
          root: workspace.root,
          activeNodeId: workspace.activeNodeId,
          terminalStates: workspace.terminalStates || {}
        }));
        
        console.log('Saving workspaces to server:', workspacesToSave);
        
        // Save workspaces to server
        await axios.post(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WORKSPACES}`,
          { workspaces: workspacesToSave },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Failed to save workspaces to server:', error);
      }
    };
    
    const timeoutId = setTimeout(saveWorkspaces, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [workspaces, isLoading]);
  
  // Update a specific workspace
  const updateWorkspace = useCallback((index, updater) => {
    setWorkspaces(prev => {
      const updated = [...prev];
      if (typeof updater === 'function') {
        updated[index] = {
          ...updated[index],
          ...updater(updated[index])
        };
      } else {
        updated[index] = {
          ...updated[index],
          ...updater
        };
      }
      return updated;
    });
  }, []);
  
  // Switch to a different workspace
  const switchWorkspace = useCallback((target) => {
    if (typeof target === 'number' && target >= 0 && target < workspaces.length) {
      setCurrentWorkspaceIndex(target);
    } else if (target === 'right' || target === 'left') {
      setCurrentWorkspaceIndex(prev => {
        const newIndex = target === 'right' 
          ? (prev + 1) % workspaces.length 
          : prev - 1 < 0 ? workspaces.length - 1 : prev - 1;
        return newIndex;
      });
    }
  }, [workspaces.length]);
  
  // Context value
  const value = useMemo(() => ({
    workspaces,
    setWorkspaces,
    currentWorkspaceIndex,
    currentWorkspace: workspaces[currentWorkspaceIndex],
    updateWorkspace,
    switchWorkspace,
    isLoading,
    loadWorkspaces
  }), [workspaces, setWorkspaces, currentWorkspaceIndex, updateWorkspace, switchWorkspace, isLoading, loadWorkspaces]);
  
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Custom hook to use the workspace context
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
