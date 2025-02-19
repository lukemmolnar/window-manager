import { useState, useCallback, useEffect, useReducer } from 'react';
import { Node } from '../models/Node';
import { WINDOW_TYPES } from '../utils/windowTypes';
import { 
  splitNodeById, 
  removeNodeById, 
  findNodeById, 
  findAllWindowIds,
  updateSplitRatio,
} from '../utils/treeUtils';
import { getWindowBounds } from '../utils/windowUtils';

export const useWindowManager = ({ defaultLayout = null, onChange } = {}) => {
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState([
    { id: 1, name: 'Main', root: defaultLayout, activeNodeId: null, terminalStates: {} },
    { id: 2, name: 'Code', root: null, activeNodeId: null, terminalStates: {} },
    { id: 3, name: 'Terminal', root: null, activeNodeId: null, terminalStates: {} },
    { id: 4, name: 'Preview', root: null, activeNodeId: null, terminalStates: {} }
  ]);
  const [currentWorkspaceIndex, setCurrentWorkspaceIndex] = useState(0);

  // Get current workspace data directly from workspaces array
  const currentWorkspace = workspaces[currentWorkspaceIndex];
  const rootNode = currentWorkspace.root;
  const activeNodeId = currentWorkspace.activeNodeId;
  const terminalStates = currentWorkspace.terminalStates;

  // Add logging to track workspace values
  console.log('useWindowManager state:', {
    workspaces,
    currentWorkspaceIndex,
    workspaceCount: workspaces.length
  });

  // Create setActiveNodeId function that updates the workspace
  const setActiveNodeId = useCallback((nodeId) => {
    setWorkspaces(prev => {
      const updated = [...prev];
      updated[currentWorkspaceIndex] = {
        ...updated[currentWorkspaceIndex],
        activeNodeId: nodeId
      };
      return updated;
    });
  }, [currentWorkspaceIndex]);

  // Update workspace state
  const updateWorkspace = useCallback((updater) => {
    setWorkspaces(prev => {
      const updated = [...prev];
      if (typeof updater === 'function') {
        updated[currentWorkspaceIndex] = {
          ...updated[currentWorkspaceIndex],
          ...updater(updated[currentWorkspaceIndex])
        };
      } else {
        updated[currentWorkspaceIndex] = {
          ...updated[currentWorkspaceIndex],
          ...updater
        };
      }
      return updated;
    });
  }, [currentWorkspaceIndex]);

  const switchWorkspace = useCallback((direction) => {
    setCurrentWorkspaceIndex(prev => {
      let newIndex;
      if (direction === 'right') {
        newIndex = (prev + 1) % workspaces.length;
      } else {
        newIndex = prev - 1;
        if (newIndex < 0) newIndex = workspaces.length - 1;
      }
      return newIndex;
    });
  }, [workspaces.length]);

  useEffect(() => {
    const handleWorkspaceKeys = (e) => {
      if (e.ctrlKey && e.altKey) {
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            switchWorkspace('right');
            break;
          case 'ArrowLeft':
            e.preventDefault();
            switchWorkspace('left');
            break;
          // Removed 'n' key handler for creating new workspaces
        }
      }
    };

    window.addEventListener('keydown', handleWorkspaceKeys);
    return () => window.removeEventListener('keydown', handleWorkspaceKeys);
  }, [switchWorkspace]);

  const workspaceCount = workspaces.length;


  // Your existing window navigation functions
  const navigateToWindow = useCallback((direction) => {
    if (!activeNodeId || !rootNode) return;
  
    const allWindows = getWindowBounds(rootNode);
    const activeWindow = allWindows.find(w => w.id === activeNodeId);
    if (!activeWindow) return;
  
    const adjacentWindows = allWindows.filter(w => {
      if (w.id === activeNodeId) return false;
  
      const bounds = w.bounds;
      const activeBounds = activeWindow.bounds;
  
      const hasVerticalOverlap = () => 
        !(bounds.bottom < activeBounds.top || bounds.top > activeBounds.bottom);
  
      const horizontalOverlap = () => 
        !(bounds.right < activeBounds.left || bounds.left > activeBounds.right);
  
      const tolerance = 0.01;
  
      switch (direction) {
        case 'up':
          return hasVerticalOverlap() &&
                 Math.abs(bounds.bottom - activeBounds.top) < tolerance;
        case 'down':
          return hasVerticalOverlap() &&
                 Math.abs(bounds.top - activeBounds.bottom) < tolerance;
        case 'left':
          return horizontalOverlap() &&
                 Math.abs(bounds.right - activeBounds.left) < tolerance;
        case 'right':
          return horizontalOverlap() &&
                 Math.abs(bounds.left - activeBounds.right) < tolerance;
        default:
          return false;
      }
    });
  
    if (adjacentWindows.length === 0) return;
  
    let nextWindow;
    switch (direction) {
      case 'left':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerX !== b.bounds.centerX
            ? b.bounds.centerX - a.bounds.centerX
            : a.bounds.centerY - b.bounds.centerY
        )[0];
        break;
      
      case 'right':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerX !== b.bounds.centerX
            ? a.bounds.centerX - b.bounds.centerX
            : a.bounds.centerY - b.bounds.centerY
        )[0];
        break;
      
      case 'up':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerY !== b.bounds.centerY
            ? b.bounds.centerY - a.bounds.centerY
            : a.bounds.centerX - b.bounds.centerX
        )[0];
        break;
      
      case 'down':
        nextWindow = adjacentWindows.sort((a, b) => 
          a.bounds.centerY !== b.bounds.centerY
            ? a.bounds.centerY - b.bounds.centerY
            : a.bounds.centerX - b.bounds.centerX
        )[0];
        break;
    }
  
    if (nextWindow) {
      setActiveNodeId(nextWindow.id);
    }
  }, [activeNodeId, rootNode, setActiveNodeId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.ctrlKey) return;
  
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateToWindow('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateToWindow('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateToWindow('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateToWindow('down');
          break;
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToWindow]);

  const createNewWindow = useCallback((windowType) => {
    const newNode = Node.createWindow(Date.now(), windowType || WINDOW_TYPES.TERMINAL);
    
    if (windowType === WINDOW_TYPES.TERMINAL) {
      updateWorkspace(workspace => ({
        ...workspace,
        terminalStates: {
          ...workspace.terminalStates,
          [newNode.id]: {
            history: ['Welcome to the Terminal! Type "help" for available commands.'],
            commandHistory: []
          }
        }
      }));
    }
    
    if (!rootNode) {
      updateWorkspace({
        root: newNode,
        activeNodeId: newNode.id
      });
      return;
    }
    
    if (!activeNodeId) {
      updateWorkspace({
        root: newNode,
        activeNodeId: newNode.id
      });
      return;
    }
    
    splitWindow(activeNodeId, 'vertical', newNode);
    setActiveNodeId(newNode.id);
  }, [rootNode, activeNodeId, updateWorkspace, setActiveNodeId]);

  const splitWindow = useCallback((nodeId, direction, newWindow = null) => {
    if (!newWindow) {
      newWindow = Node.createWindow(Date.now(), WINDOW_TYPES.TERMINAL);
    }
  
    updateWorkspace(workspace => ({
      ...workspace,
      root: splitNodeById(workspace.root, nodeId, direction, newWindow)
    }));
  }, [updateWorkspace]);

  const closeWindow = useCallback((nodeId) => {
    if (rootNode.type === 'window' && rootNode.id === nodeId) {
      updateWorkspace({
        root: null,
        activeNodeId: null
      });
      return;
    }

    const newRoot = JSON.parse(JSON.stringify(rootNode));
    const result = removeNodeById(newRoot, nodeId);
    
    if (activeNodeId === nodeId && result) {
      const nextWindowId = findAllWindowIds(result)[0] || null;
      updateWorkspace({
        root: result,
        activeNodeId: nextWindowId
      });
    } else {
      updateWorkspace({
        root: result
      });
    }
  }, [rootNode, activeNodeId, updateWorkspace]);

  const transformWindow = useCallback((nodeId, newType) => {
    const newRoot = JSON.parse(JSON.stringify(rootNode));
    
    const updateNodeInTree = (node) => {
      if (!node) return null;
      
      if (node.type === 'window' && node.id === nodeId) {
        node.windowType = newType;
        return true;
      }
      
      if (node.type === 'split') {
        return updateNodeInTree(node.first) || updateNodeInTree(node.second);
      }
      
      return false;
    };
    
    const updated = updateNodeInTree(newRoot);
    if (updated) {
      updateWorkspace({
        root: newRoot
      });
    }
  }, [rootNode, updateWorkspace]);

  const handleCommand = useCallback((command) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'split':
        if (activeNodeId) {
          const direction = parts[1] === 'vertical' ? 'vertical' : 'horizontal';
          splitWindow(activeNodeId, direction);
        }
        break;
      case 'close':
        if (activeNodeId) {
          closeWindow(activeNodeId);
        }
        break;
    }
  }, [activeNodeId, splitWindow, closeWindow]);

  const wsCount = Number(workspaces.length);
  const wsIndex = Number(currentWorkspaceIndex);

  return {
    rootNode,
    activeNodeId,
    setActiveNodeId,
    terminalStates,
    createNewWindow,
    splitWindow,
    closeWindow,
    transformWindow,
    handleCommand,
    navigateToWindow,
    hasActiveWindow: Boolean(activeNodeId),
    hasRootNode: Boolean(rootNode),
    currentWorkspaceIndex: wsIndex,
    workspaceCount: wsCount,
    switchWorkspace
  };
};
