import { useState, useCallback, useEffect, useRef } from 'react';
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
import { useWindowState } from '../context/WindowStateContext';
export const useWindowManager = ({ defaultLayout = null } = {}) => {
  // Workspace state
  const [workspaces, setWorkspaces] = useState([
    { id: 1, name: 'Main', root: defaultLayout, activeNodeId: null, terminalStates: {} },
    { id: 2, name: 'Code', root: null, activeNodeId: null, terminalStates: {} },
    { id: 3, name: 'Terminal', root: null, activeNodeId: null, terminalStates: {} },
    { id: 4, name: 'Preview', root: null, activeNodeId: null, terminalStates: {} }
  ]);
  const [currentWorkspaceIndex, setCurrentWorkspaceIndex] = useState(0);
  const [isResizeMode, setIsResizeMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);

  // Get current workspace data directly from workspaces array
  const currentWorkspace = workspaces[currentWorkspaceIndex];
  const rootNode = currentWorkspace.root;
  const activeNodeId = currentWorkspace.activeNodeId;
  const terminalStates = currentWorkspace.terminalStates;

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

  const switchWorkspace = useCallback((target) => {
    console.log('Switching to:', target);
    if (typeof target === 'number' && target >= 0 && target < 4) {
      setCurrentWorkspaceIndex(target);
    } else if (target === 'right' || target === 'left') {
      setCurrentWorkspaceIndex(prev => {
        const newIndex = target === 'right' 
          ? (prev + 1) % 4 
          : prev - 1 < 0 ? 3 : prev - 1;
        console.log('New index:', newIndex);
        return newIndex;
      });
    }
  }, [setCurrentWorkspaceIndex]);

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

  // Window navigation functions
  const navigateToWindow = useCallback((direction) => {
    if (!activeNodeId || !rootNode) return;
  
    const allWindows = getWindowBounds(rootNode);
    const activeWindow = allWindows.find(w => w.id === activeNodeId);
    if (!activeWindow) return;
  
    // Filter out the active window
    const otherWindows = allWindows.filter(w => w.id !== activeNodeId);
    
    // If no other windows, nothing to navigate to
    if (otherWindows.length === 0) return;
    
    // Calculate the active window's center
    const activeBounds = activeWindow.bounds;
    
    // Helper function to calculate overlap percentage between windows
    const calculateOverlap = (window1, window2, isHorizontal) => {
      if (isHorizontal) {
        // Calculate horizontal overlap
        const overlapStart = Math.max(window1.left, window2.left);
        const overlapEnd = Math.min(window1.right, window2.right);
        if (overlapEnd <= overlapStart) return 0; // No overlap
        
        const overlapWidth = overlapEnd - overlapStart;
        const window1Width = window1.right - window1.left;
        
        return overlapWidth / window1Width;
      } else {
        // Calculate vertical overlap
        const overlapStart = Math.max(window1.top, window2.top);
        const overlapEnd = Math.min(window1.bottom, window2.bottom);
        if (overlapEnd <= overlapStart) return 0; // No overlap
        
        const overlapHeight = overlapEnd - overlapStart;
        const window1Height = window1.bottom - window1.top;
        
        return overlapHeight / window1Height;
      }
    };
    
    // Find windows in the specified direction with a more relaxed approach
    let candidateWindows = [];
    const tolerance = 0.1; // 10% tolerance for adjacency
    
    switch (direction) {
      case 'up':
        // Windows that are above the active window
        candidateWindows = otherWindows.filter(w => {
          const bounds = w.bounds;
          // Window must be above the active window
          if (bounds.bottom > activeBounds.top) return false;
          
          // Calculate horizontal overlap
          const overlap = calculateOverlap(activeBounds, bounds, true);
          return overlap > 0; // Any overlap makes it a candidate
        });
        break;
        
      case 'down':
        // Windows that are below the active window
        candidateWindows = otherWindows.filter(w => {
          const bounds = w.bounds;
          // Window must be below the active window
          if (bounds.top < activeBounds.bottom) return false;
          
          // Calculate horizontal overlap
          const overlap = calculateOverlap(activeBounds, bounds, true);
          return overlap > 0; // Any overlap makes it a candidate
        });
        break;
        
      case 'left':
        // Windows that are to the left of the active window
        candidateWindows = otherWindows.filter(w => {
          const bounds = w.bounds;
          // Window must be to the left of the active window
          if (bounds.right > activeBounds.left) return false;
          
          // Calculate vertical overlap
          const overlap = calculateOverlap(activeBounds, bounds, false);
          return overlap > 0; // Any overlap makes it a candidate
        });
        break;
        
      case 'right':
        // Windows that are to the right of the active window
        candidateWindows = otherWindows.filter(w => {
          const bounds = w.bounds;
          // Window must be to the right of the active window
          if (bounds.left < activeBounds.right) return false;
          
          // Calculate vertical overlap
          const overlap = calculateOverlap(activeBounds, bounds, false);
          return overlap > 0; // Any overlap makes it a candidate
        });
        break;
    }
    
    // If no candidates found, return
    if (candidateWindows.length === 0) return;
    
    // Calculate scores for each candidate window based on:
    // 1. Overlap percentage (higher is better)
    // 2. Distance from active window (lower is better)
    const scoredWindows = candidateWindows.map(window => {
      const bounds = window.bounds;
      let overlapScore = 0;
      let distanceScore = 0;
      
      switch (direction) {
        case 'up':
          overlapScore = calculateOverlap(activeBounds, bounds, true);
          distanceScore = activeBounds.top - bounds.bottom;
          break;
          
        case 'down':
          overlapScore = calculateOverlap(activeBounds, bounds, true);
          distanceScore = bounds.top - activeBounds.bottom;
          break;
          
        case 'left':
          overlapScore = calculateOverlap(activeBounds, bounds, false);
          distanceScore = activeBounds.left - bounds.right;
          break;
          
        case 'right':
          overlapScore = calculateOverlap(activeBounds, bounds, false);
          distanceScore = bounds.left - activeBounds.right;
          break;
      }
      
      // Normalize distance score (closer is better)
      const normalizedDistanceScore = 1 / (1 + distanceScore);
      
      // Calculate final score with higher weight on overlap
      const finalScore = (overlapScore * 0.7) + (normalizedDistanceScore * 0.3);
      
      return {
        window,
        overlapScore,
        distanceScore,
        finalScore
      };
    });
    
    // Sort by final score (higher is better)
    scoredWindows.sort((a, b) => b.finalScore - a.finalScore);
    
    // Select the window with the highest score
    const nextWindow = scoredWindows[0].window;
    
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

  // Get window state management functions
  const { getWindowState, setWindowState, removeWindowState } = useWindowState();

  const createNewWindow = useCallback((windowType) => {
    const newNode = Node.createWindow(Date.now(), windowType || WINDOW_TYPES.TERMINAL);
    
    // Initialize window state based on window type
    const initialContent = {};
    
    if (windowType === WINDOW_TYPES.TERMINAL) {
      // Initialize terminal state
      initialContent.history = ['Welcome to the Terminal! Type "help" for available commands.'];
      initialContent.commandHistory = [];
      
      updateWorkspace(workspace => ({
        ...workspace,
        terminalStates: {
          ...workspace.terminalStates,
          [newNode.id]: {
            history: initialContent.history,
            commandHistory: initialContent.commandHistory
          }
        }
      }));
    } else if (windowType === WINDOW_TYPES.EDITOR) {
      // Initialize editor state with default content
      initialContent.text = `function hello() {\n  console.log("Hello, World!");\n}\n\n// Call the function\nhello();`;
    } else if (windowType === WINDOW_TYPES.EXPLORER) {
      // Initialize explorer state
      initialContent.currentPath = '/';
      initialContent.selectedItem = null;
    }
    
    // Set the initial window state
    setWindowState(newNode.id, newNode.windowType, initialContent);
    
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
  }, [rootNode, activeNodeId, updateWorkspace, setActiveNodeId, setWindowState]);

  const splitWindow = useCallback((nodeId, direction, newWindow = null) => {
    // Get the original window's state if it exists
    const originalWindowState = getWindowState(nodeId);
    
    if (!newWindow) {
      newWindow = Node.createWindow(Date.now(), WINDOW_TYPES.TERMINAL);
    }
    
    // If the original window had state, copy it to the new window
    if (originalWindowState) {
      // Clone the content to avoid reference issues
      const clonedContent = JSON.parse(JSON.stringify(originalWindowState.content));
      setWindowState(newWindow.id, newWindow.windowType, clonedContent);
    }
  
    updateWorkspace(workspace => ({
      ...workspace,
      root: splitNodeById(workspace.root, nodeId, direction, newWindow)
    }));
  }, [updateWorkspace, getWindowState, setWindowState]);

  const closeWindow = useCallback((nodeId) => {
    // Clean up window state when closing a window
    removeWindowState(nodeId);
    
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
  }, [rootNode, activeNodeId, updateWorkspace, removeWindowState]);

  const transformWindow = useCallback((nodeId, newType) => {
    const newRoot = JSON.parse(JSON.stringify(rootNode));
    
    // Get the current window state before transformation
    const currentWindowState = getWindowState(nodeId);
    
    const updateNodeInTree = (node) => {
      if (!node) return null;
      
      if (node.type === 'window' && node.id === nodeId) {
        // Update the window type
        node.windowType = newType;
        
        // Update the window state with the new type but preserve content
        if (currentWindowState) {
          setWindowState(nodeId, newType, currentWindowState.content);
        }
        
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
  }, [rootNode, updateWorkspace, getWindowState, setWindowState]);

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

  const resizeActiveWindow = useCallback((direction) => {
    if (!activeNodeId || !rootNode || !isResizeMode) return;
  
    updateWorkspace(workspace => {
      const newRoot = JSON.parse(JSON.stringify(workspace.root));
      
      // Helper function to find all affected splits and determine if window is in second child
      const findAffectedSplits = (node, targetId) => {
        if (!node) return [];
        
        const splits = [];
        if (node.type === 'split') {
          const targetInFirst = findNodeById(node.first, targetId);
          const targetInSecond = findNodeById(node.second, targetId);
          
          if (targetInFirst || targetInSecond) {
            // Add this split if it matches our resize direction
            if ((direction === 'left' || direction === 'right') && node.direction === 'horizontal') {
              splits.push({ 
                node, 
                targetInFirst: !!targetInFirst,
                // If this is a horizontal split and window is in second child, it's on the right side
                isRightSide: !!targetInSecond && node.direction === 'horizontal'
              });
            }
            if ((direction === 'up' || direction === 'down') && node.direction === 'vertical') {
              splits.push({ 
                node, 
                targetInFirst: !!targetInFirst,
                isRightSide: !!targetInSecond && node.direction === 'horizontal',
                isBottomSide: !!targetInSecond && node.direction === 'vertical'
              });
            }
          }
          
          splits.push(...findAffectedSplits(node.first, targetId));
          splits.push(...findAffectedSplits(node.second, targetId));
        }
        
        return splits;
      };
  
      const affectedSplits = findAffectedSplits(newRoot, activeNodeId);
      const resizeStep = 0.05;
  
      // Apply resize to all affected splits
      affectedSplits.forEach(({ node, targetInFirst, isRightSide, isBottomSide }) => {
        // Determine if we need to invert the direction based on window position
        let effectiveDirection = direction;
        if (isRightSide && (direction === 'left' || direction === 'right')) {
          effectiveDirection = direction === 'left' ? 'right' : 'left';
        }
        if (isBottomSide && (direction === 'up' || direction === 'down')) {
          effectiveDirection = direction === 'up' ? 'down' : 'up';
        }
        
        switch (effectiveDirection) {
          case 'left': // Shrink width
            if (targetInFirst) {
              node.splitRatio = Math.max(0.1, node.splitRatio - resizeStep);
            } else {
              node.splitRatio = Math.min(0.9, node.splitRatio + resizeStep);
            }
            break;
            
          case 'right': // Grow width
            if (targetInFirst) {
              node.splitRatio = Math.min(0.9, node.splitRatio + resizeStep);
            } else {
              node.splitRatio = Math.max(0.1, node.splitRatio - resizeStep);
            }
            break;
            
          case 'up': // Shrink height
            if (targetInFirst) {
              node.splitRatio = Math.max(0.1, node.splitRatio - resizeStep);
            } else {
              node.splitRatio = Math.min(0.9, node.splitRatio + resizeStep);
            }
            break;
            
          case 'down': // Grow height
            if (targetInFirst) {
              node.splitRatio = Math.min(0.9, node.splitRatio + resizeStep);
            } else {
              node.splitRatio = Math.max(0.1, node.splitRatio - resizeStep);
            }
            break;
        }
      });
  
      return { ...workspace, root: newRoot };
    });
  }, [activeNodeId, rootNode, isResizeMode, updateWorkspace]);
  
  // Also add a debug check to see if the keyboard shortcut and resize mode are working
  useEffect(() => {
    console.log('Resize mode:', isResizeMode);
  }, [isResizeMode]);

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
    currentWorkspaceIndex,
    workspaceCount: 4,
    switchWorkspace,
    isResizeMode,
    setIsResizeMode,
    resizeActiveWindow
  };
};
