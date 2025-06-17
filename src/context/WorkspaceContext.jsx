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
 * Enhanced data migration function to backfill missing partyMode from IndexedDB
 * This fixes the issue where party mode was saved to IndexedDB but not WorkspaceContext
 * Now also finds "orphaned" terminals that exist in IndexedDB but not in workspace
 */
const migrateTerminalStates = async (workspaces) => {
  console.log('[PARTY DEBUG] Starting enhanced terminal states migration...');
  
  try {
    // Import IndexedDB functions
    const { getTerminalState, getAllTerminalStates } = await import('../services/indexedDBService');
    
    // Clone workspaces to avoid mutations
    const migratedWorkspaces = JSON.parse(JSON.stringify(workspaces));
    
    let migrationCount = 0;
    let orphanedCount = 0;
    
    // Step 1: Process existing terminals in workspaces
    for (const workspace of migratedWorkspaces) {
      if (!workspace.terminalStates) continue;
      
      // Process each terminal in the workspace
      for (const [terminalId, terminalState] of Object.entries(workspace.terminalStates)) {
        // Check if partyMode is missing or undefined
        if (terminalState.partyMode === undefined) {
          console.log(`[PARTY DEBUG] Terminal ${terminalId} missing partyMode, checking IndexedDB...`);
          
          try {
            // Try to load the full state from IndexedDB
            const indexedDBState = await getTerminalState(terminalId);
            
            if (indexedDBState && indexedDBState.content && indexedDBState.content.partyMode !== undefined) {
              console.log(`[PARTY DEBUG] Found partyMode in IndexedDB for terminal ${terminalId}:`, indexedDBState.content.partyMode);
              
              // Merge the missing partyMode into the workspace terminal state
              terminalState.partyMode = indexedDBState.content.partyMode;
              migrationCount++;
              
              console.log(`[PARTY DEBUG] Migrated partyMode for terminal ${terminalId}: ${indexedDBState.content.partyMode}`);
            } else {
              console.log(`[PARTY DEBUG] No partyMode found in IndexedDB for terminal ${terminalId}`);
            }
          } catch (error) {
            console.warn(`[PARTY DEBUG] Failed to load IndexedDB state for terminal ${terminalId}:`, error);
          }
        } else {
          console.log(`[PARTY DEBUG] Terminal ${terminalId} already has partyMode:`, terminalState.partyMode);
        }
      }
    }
    
    // Step 2: Find orphaned terminals with party mode in IndexedDB
    console.log('[PARTY DEBUG] Searching for orphaned terminals with party mode...');
    
    try {
      // Get all terminal states from IndexedDB
      const allTerminalStates = await getAllTerminalStates();
      console.log(`[PARTY DEBUG] Found ${allTerminalStates.length} total terminals in IndexedDB`);
      
      // Find terminals with party mode that aren't in any workspace
      for (const terminalData of allTerminalStates) {
        const terminalId = terminalData.id;
        const content = terminalData.content;
        
        // Check if this terminal has party mode enabled
        if (content && content.partyMode === true) {
          console.log(`[PARTY DEBUG] Found terminal ${terminalId} with partyMode: true in IndexedDB`);
          
          // Check if this terminal exists in any workspace
          let foundInWorkspace = false;
          for (const workspace of migratedWorkspaces) {
            if (workspace.terminalStates && workspace.terminalStates[terminalId]) {
              foundInWorkspace = true;
              break;
            }
          }
          
          if (!foundInWorkspace) {
            console.log(`[PARTY DEBUG] Orphaned terminal ${terminalId} found! Adding to workspace 0...`);
            
            // Add the orphaned terminal to the first workspace (index 0)
            if (!migratedWorkspaces[0].terminalStates) {
              migratedWorkspaces[0].terminalStates = {};
            }
            
            // Create a basic terminal state with the content from IndexedDB
            migratedWorkspaces[0].terminalStates[terminalId] = {
              history: content.history || ['Terminal restored from IndexedDB'],
              commandHistory: content.commandHistory || [],
              currentInput: content.currentInput || '',
              historyIndex: content.historyIndex || -1,
              partyMode: content.partyMode
            };
            
            orphanedCount++;
            console.log(`[PARTY DEBUG] Restored orphaned terminal ${terminalId} with partyMode: ${content.partyMode}`);
          } else {
            console.log(`[PARTY DEBUG] Terminal ${terminalId} already exists in workspace`);
          }
        }
      }
    } catch (error) {
      console.warn('[PARTY DEBUG] Failed to search for orphaned terminals:', error);
    }
    
    console.log(`[PARTY DEBUG] Migration complete. Migrated ${migrationCount} terminal states, restored ${orphanedCount} orphaned terminals.`);
    return migratedWorkspaces;
    
  } catch (error) {
    console.error('[PARTY DEBUG] Migration failed:', error);
    // Return original workspaces if migration fails
    return workspaces;
  }
};

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
        console.log('[PARTY DEBUG] No auth token found, using initial workspaces');
        setIsLoading(false);
        return;
      }
      
      console.log('[PARTY DEBUG] Loading workspaces from server...');
      
      // Fetch workspaces from server
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WORKSPACES}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && response.data.workspaces) {
        console.log('[PARTY DEBUG] Loaded workspaces from server:', response.data.workspaces);
        
        // Perform data migration to backfill missing partyMode from IndexedDB
        const migratedWorkspaces = await migrateTerminalStates(response.data.workspaces);
        
        // Check each workspace for terminal states with party mode after migration
        migratedWorkspaces.forEach((workspace, index) => {
          console.log(`[PARTY DEBUG] Workspace ${index} terminal states (after migration):`, workspace.terminalStates);
          if (workspace.terminalStates) {
            Object.entries(workspace.terminalStates).forEach(([terminalId, state]) => {
              if (state.partyMode) {
                console.log(`[PARTY DEBUG] Found party mode in workspace ${index}, terminal ${terminalId}:`, state.partyMode);
              }
            });
          }
        });
        
        setWorkspaces(migratedWorkspaces);
      } else {
        console.log('[PARTY DEBUG] No saved workspaces found, using initial workspaces');
      }
    } catch (error) {
      console.error('[PARTY DEBUG] Failed to load workspaces from server:', error);
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
        
        console.log('[PARTY DEBUG] Saving workspaces to server...');
        
        // Check for party mode in terminal states before saving
        workspacesToSave.forEach((workspace, index) => {
          if (workspace.terminalStates) {
            Object.entries(workspace.terminalStates).forEach(([terminalId, state]) => {
              if (state.partyMode) {
                console.log(`[PARTY DEBUG] Saving party mode in workspace ${index}, terminal ${terminalId}:`, state.partyMode);
              }
            });
          }
        });
        
        console.log('[PARTY DEBUG] Full workspaces data:', workspacesToSave);
        
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
