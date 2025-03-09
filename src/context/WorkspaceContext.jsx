import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  saveWorkspace, 
  getWorkspace, 
  getAllWorkspaces, 
  saveAllWorkspaces 
} from '../services/indexedDBService';

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
  
  // Load workspaces from IndexedDB on mount
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setIsLoading(true);
        const savedWorkspaces = await getAllWorkspaces();
        
        if (savedWorkspaces && savedWorkspaces.length > 0) {
          console.log('Loaded workspaces from IndexedDB:', savedWorkspaces);
          setWorkspaces(savedWorkspaces);
        } else {
          console.log('No saved workspaces found, using initial workspaces');
        }
      } catch (error) {
        console.error('Failed to load workspaces from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWorkspaces();
  }, []);
  
  // Save workspaces to IndexedDB whenever they change
  useEffect(() => {
    if (isLoading) return; // Skip saving during initial load
    
    const saveWorkspaces = async () => {
      try {
        // Ensure we're only saving the array of workspaces
        // Create a clean copy without any non-array properties
        const workspacesToSave = [...workspaces].map(workspace => ({
          id: workspace.id,
          name: workspace.name,
          root: workspace.root,
          activeNodeId: workspace.activeNodeId,
          terminalStates: workspace.terminalStates || {}
        }));
        
        console.log('Saving workspaces to IndexedDB:', workspacesToSave);
        await saveAllWorkspaces(workspacesToSave);
      } catch (error) {
        console.error('Failed to save workspaces to IndexedDB:', error);
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
    currentWorkspaceIndex,
    currentWorkspace: workspaces[currentWorkspaceIndex],
    updateWorkspace,
    switchWorkspace,
    isLoading
  }), [workspaces, currentWorkspaceIndex, updateWorkspace, switchWorkspace, isLoading]);
  
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
