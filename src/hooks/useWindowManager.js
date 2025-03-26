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
import { useWorkspace } from '../context/WorkspaceContext';
import { 
  MIN_WINDOW_WIDTH_PX, 
  MIN_WINDOW_HEIGHT_PX 
} from '../utils/windowSizeConstants';
import { 
  saveActiveWindow, 
  getActiveWindow,
  // Include these imports for easier access in our swapWindows function
  getWindowState
} from '../services/indexedDBService';

export const useWindowManager = ({ defaultLayout = null, onFlashBorder = null } = {}) => {
  // Use workspace context instead of internal state
  const { 
    workspaces,
    currentWorkspaceIndex,
    currentWorkspace,
    updateWorkspace,
    switchWorkspace
  } = useWorkspace();
  
  // Get current workspace data
  const rootNode = currentWorkspace.root;
  const activeNodeId = currentWorkspace.activeNodeId;
  const terminalStates = currentWorkspace.terminalStates;
  
  const [isResizeMode, setIsResizeMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveSourceWindowId, setMoveSourceWindowId] = useState(null);

  // Create setActiveNodeId function that updates the workspace
  const setActiveNodeId = useCallback((nodeId) => {
    updateWorkspace(currentWorkspaceIndex, workspace => ({
      ...workspace,
      activeNodeId: nodeId
    }));
    
    // Save the active window ID to IndexedDB for persistence across refreshes
    if (nodeId) {
      // Get the window type from the node
      const node = findNodeById(rootNode, nodeId);
      if (node && node.windowType) {
        // Save the active window ID for this window type
        saveActiveWindow({
          id: 'activeWindow',
          activeNodeId: nodeId,
          windowType: node.windowType
        }).catch(error => {
          console.error('Failed to save active window ID to IndexedDB:', error);
        });
      }
    }
  }, [updateWorkspace, currentWorkspaceIndex, rootNode]);
  
  // Load the active window ID from IndexedDB on mount
  useEffect(() => {
    const loadActiveWindow = async () => {
      try {
        // Try to load the active window ID from IndexedDB
        const savedActiveWindow = await getActiveWindow('activeWindow');
        
        if (savedActiveWindow && savedActiveWindow.activeNodeId) {
          console.log('Loaded active window ID from IndexedDB:', savedActiveWindow.activeNodeId);
          
          // Check if the window still exists in the current workspace
          if (rootNode && findNodeById(rootNode, savedActiveWindow.activeNodeId)) {
            // Update the active window ID
            setActiveNodeId(savedActiveWindow.activeNodeId);
          }
        }
      } catch (error) {
        console.error('Failed to load active window ID from IndexedDB:', error);
      }
    };
    
    // Only load if we have a root node but no active node
    if (rootNode && !activeNodeId) {
      loadActiveWindow();
    }
  }, [rootNode, activeNodeId, setActiveNodeId]);

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

  // Helper function to convert percentage-based bounds to pixel dimensions
  const calculatePixelDimensions = useCallback((bounds) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const pixelDimensions = {
      width: (bounds.width / 100) * windowWidth,
      height: (bounds.height / 100) * windowHeight
    };
    
    console.log('Window dimensions (percentage):', bounds);
    console.log('Window dimensions (pixels):', pixelDimensions);
    console.log('Minimum required:', MIN_WINDOW_WIDTH_PX, 'x', MIN_WINDOW_HEIGHT_PX);
    console.log('Is too small:', 
      pixelDimensions.width < MIN_WINDOW_WIDTH_PX || 
      pixelDimensions.height < MIN_WINDOW_HEIGHT_PX
    );
    
    return pixelDimensions;
  }, []);

  // Helper function to check if a resize operation would result in windows that are too small
  const wouldViolateMinSize = useCallback((root, direction, affectedSplits, resizeStep) => {
    console.log('Checking if resize would violate minimum size...');
    console.log('Direction:', direction);
    console.log('Affected splits:', affectedSplits.length);
    console.log('Browser window size:', window.innerWidth, 'x', window.innerHeight);
    
    // Create a deep copy of the root to simulate the resize
    const simulatedRoot = JSON.parse(JSON.stringify(root));
    
    // Apply the resize to the simulated root
    affectedSplits.forEach(({ node: originalNode, targetInFirst, isRightSide, isBottomSide }) => {
      // Find the corresponding node in the simulated root
      const simulatedNode = findNodeById(simulatedRoot, originalNode.id);
      if (!simulatedNode) return;
      
      console.log('Simulating resize on node:', simulatedNode.id);
      console.log('Original split ratio:', simulatedNode.splitRatio);
      
      // Determine effective direction
      let effectiveDirection = direction;
      if (isRightSide && (direction === 'left' || direction === 'right')) {
        effectiveDirection = direction === 'left' ? 'right' : 'left';
      }
      if (isBottomSide && (direction === 'up' || direction === 'down')) {
        effectiveDirection = direction === 'up' ? 'down' : 'up';
      }
      
      console.log('Effective direction:', effectiveDirection);
      
      // Apply the resize
      switch (effectiveDirection) {
        case 'left': // Shrink width
          if (targetInFirst) {
            simulatedNode.splitRatio = Math.max(0.1, simulatedNode.splitRatio - resizeStep);
          } else {
            simulatedNode.splitRatio = Math.min(0.9, simulatedNode.splitRatio + resizeStep);
          }
          break;
          
        case 'right': // Grow width
          if (targetInFirst) {
            simulatedNode.splitRatio = Math.min(0.9, simulatedNode.splitRatio + resizeStep);
          } else {
            simulatedNode.splitRatio = Math.max(0.1, simulatedNode.splitRatio - resizeStep);
          }
          break;
          
        case 'up': // Shrink height
          if (targetInFirst) {
            simulatedNode.splitRatio = Math.max(0.1, simulatedNode.splitRatio - resizeStep);
          } else {
            simulatedNode.splitRatio = Math.min(0.9, simulatedNode.splitRatio + resizeStep);
          }
          break;
          
        case 'down': // Grow height
          if (targetInFirst) {
            simulatedNode.splitRatio = Math.min(0.9, simulatedNode.splitRatio + resizeStep);
          } else {
            simulatedNode.splitRatio = Math.max(0.1, simulatedNode.splitRatio - resizeStep);
          }
          break;
      }
      
      console.log('New split ratio:', simulatedNode.splitRatio);
    });
    
    // Calculate the bounds of all windows after the simulated resize
    const simulatedWindows = getWindowBounds(simulatedRoot);
    console.log('Number of windows to check:', simulatedWindows.length);
    
    // Check if any window would be smaller than the minimum size
    const tooSmallWindows = simulatedWindows.filter(window => {
      const pixelDimensions = calculatePixelDimensions(window.bounds);
      return pixelDimensions.width < MIN_WINDOW_WIDTH_PX || 
             pixelDimensions.height < MIN_WINDOW_HEIGHT_PX;
    });
    
    const wouldViolate = tooSmallWindows.length > 0;
    console.log('Windows that would be too small:', tooSmallWindows.length);
    console.log('Would violate minimum size:', wouldViolate);
    
    return wouldViolate;
  }, [calculatePixelDimensions]);

  // Define splitWindow before createNewWindow since createNewWindow depends on it
  const splitWindow = useCallback((nodeId, direction, newWindow = null) => {
    // Create a new terminal window if one wasn't provided
    if (!newWindow) {
      newWindow = Node.createWindow(Date.now(), WINDOW_TYPES.TERMINAL);
      
      // Initialize terminal state with default content
      const initialContent = {
        history: ['Welcome to the Terminal! Type "help" for available commands.'],
        commandHistory: []
      };
      
      // Set the initial window state for the terminal
      setWindowState(newWindow.id, WINDOW_TYPES.TERMINAL, initialContent);
      
      // Also update the workspace terminal states
      updateWorkspace(currentWorkspaceIndex, workspace => ({
        ...workspace,
        terminalStates: {
          ...workspace.terminalStates,
          [newWindow.id]: {
            history: initialContent.history,
            commandHistory: initialContent.commandHistory
          }
        }
      }));
    }
    
    // Check if splitting would result in windows that are too small
    const simulatedRoot = JSON.parse(JSON.stringify(rootNode));
    const simulatedSplitRoot = splitNodeById(simulatedRoot, nodeId, direction, JSON.parse(JSON.stringify(newWindow)));
    
    // Calculate the bounds of all windows after the simulated split
    const simulatedWindows = getWindowBounds(simulatedSplitRoot);
    console.log('Simulating split - number of windows:', simulatedWindows.length);
    
    // Check if any window would be smaller than the minimum size
    const tooSmallWindows = simulatedWindows.filter(window => {
      const pixelDimensions = calculatePixelDimensions(window.bounds);
      return pixelDimensions.width < MIN_WINDOW_WIDTH_PX || 
             pixelDimensions.height < MIN_WINDOW_HEIGHT_PX;
    });
    
    const wouldViolate = tooSmallWindows.length > 0;
    console.log('Split would create windows that are too small:', wouldViolate);
    
    if (wouldViolate) {
      console.log('Split blocked: would result in windows smaller than minimum size');
      // Flash the window being split to indicate we've hit the minimum size
      if (onFlashBorder && nodeId) {
        onFlashBorder(nodeId);
      }
      return;
    }
  
  updateWorkspace(currentWorkspaceIndex, workspace => ({
    ...workspace,
    root: splitNodeById(workspace.root, nodeId, direction, newWindow)
  }));
  }, [updateWorkspace, getWindowState, setWindowState, rootNode, calculatePixelDimensions, currentWorkspaceIndex]);

  const createNewWindow = useCallback((windowType) => {
    const newNode = Node.createWindow(Date.now(), windowType || WINDOW_TYPES.TERMINAL);
    
    // Initialize window state based on window type
    const initialContent = {};
    
    if (windowType === WINDOW_TYPES.TERMINAL) {
      // Initialize terminal state
      initialContent.history = ['Welcome to the Terminal! Type "help" for available commands.'];
      initialContent.commandHistory = [];
      
      updateWorkspace(currentWorkspaceIndex, workspace => ({
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
      // First window, always allowed
      updateWorkspace(currentWorkspaceIndex, {
        root: newNode,
        activeNodeId: newNode.id
      });
      return;
    }
    
    if (!activeNodeId) {
      // No active window, but we have a root - this is unusual
      // Let's check if we can add a window without violating minimum size
      const simulatedRoot = JSON.parse(JSON.stringify(rootNode));
      const simulatedWindows = getWindowBounds(simulatedRoot);
      
      // Check if existing windows are already too small
      const tooSmallWindows = simulatedWindows.filter(window => {
        const pixelDimensions = calculatePixelDimensions(window.bounds);
        return pixelDimensions.width < MIN_WINDOW_WIDTH_PX || 
               pixelDimensions.height < MIN_WINDOW_HEIGHT_PX;
      });
      
      if (tooSmallWindows.length > 0) {
        console.log('Cannot create new window: existing windows are already too small');
        // Flash the window that would be affected
        if (onFlashBorder && rootNode) {
          // If there's no active window but there's a root node, flash the root node
          const nodeToFlash = rootNode.type === 'window' ? rootNode.id : null;
          if (nodeToFlash) {
            onFlashBorder(nodeToFlash);
          }
        }
        return;
      }
      
      updateWorkspace(currentWorkspaceIndex, {
        root: newNode,
        activeNodeId: newNode.id
      });
      return;
    }
    
    // Use splitWindow which already has minimum size checks
    splitWindow(activeNodeId, 'vertical', newNode);
    setActiveNodeId(newNode.id);
  }, [rootNode, activeNodeId, updateWorkspace, setActiveNodeId, setWindowState, calculatePixelDimensions, splitWindow, currentWorkspaceIndex]);

  const closeWindow = useCallback((nodeId) => {
    // Clean up window state when closing a window
    removeWindowState(nodeId);
    
    if (rootNode.type === 'window' && rootNode.id === nodeId) {
      updateWorkspace(currentWorkspaceIndex, {
        root: null,
        activeNodeId: null
      });
      return;
    }

    const newRoot = JSON.parse(JSON.stringify(rootNode));
    const result = removeNodeById(newRoot, nodeId);
    
    if (activeNodeId === nodeId && result) {
      const nextWindowId = findAllWindowIds(result)[0] || null;
      updateWorkspace(currentWorkspaceIndex, {
        root: result,
        activeNodeId: nextWindowId
      });
    } else {
      updateWorkspace(currentWorkspaceIndex, {
        root: result
      });
    }
  }, [rootNode, activeNodeId, updateWorkspace, removeWindowState, currentWorkspaceIndex]);

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
          // If transforming to a terminal window, clear the currentInput field
          if (newType === WINDOW_TYPES.TERMINAL) {
            const updatedContent = { 
              ...currentWindowState.content,
              currentInput: '' // Clear the input field
            };
            setWindowState(nodeId, newType, updatedContent);
          } else {
            setWindowState(nodeId, newType, currentWindowState.content);
          }
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
      updateWorkspace(currentWorkspaceIndex, {
        root: newRoot
      });
    }
  }, [rootNode, updateWorkspace, getWindowState, setWindowState, currentWorkspaceIndex]);

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
  }, [activeNodeId, splitWindow, closeWindow, currentWorkspaceIndex]);

  const resizeActiveWindow = useCallback((direction) => {
    if (!activeNodeId || !rootNode || !isResizeMode) return;
  
    updateWorkspace(currentWorkspaceIndex, workspace => {
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
      
      // We no longer block resize operations based on minimum size
      // Just log that windows will be below minimum size
      const willViolateMinSize = wouldViolateMinSize(newRoot, direction, affectedSplits, resizeStep);
      if (willViolateMinSize) {
        console.log('Windows will be below minimum size, but resize is allowed');
      }
  
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
  }, [activeNodeId, rootNode, isResizeMode, updateWorkspace, wouldViolateMinSize, currentWorkspaceIndex]);
  
  // Function to swap two windows in the tree
  const swapWindows = useCallback(async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    console.log('Swapping windows:', sourceId, targetId);

    // First, get the window types and existing IndexedDB states before we modify anything
    const sourceNode = findNodeById(rootNode, sourceId);
    const targetNode = findNodeById(rootNode, targetId);
    
    if (!sourceNode || !targetNode) {
      console.log('Could not find one or both nodes to swap');
      return;
    }
    
    const sourceWindowType = sourceNode.windowType;
    const targetWindowType = targetNode.windowType;
    
    // Handle sessionStorage and localStorage swapping for chat windows
    if (sourceWindowType === WINDOW_TYPES.CHAT || targetWindowType === WINDOW_TYPES.CHAT) {
      console.log('Swapping chat window sessionStorage and localStorage entries');
      
      // Swap active room selections in sessionStorage
      const sourceActiveRoom = sessionStorage.getItem(`chat_active_room_${sourceId}`);
      const targetActiveRoom = sessionStorage.getItem(`chat_active_room_${targetId}`);
      
      console.log('Chat active rooms before swap:', { sourceActiveRoom, targetActiveRoom });
      
      if (sourceActiveRoom && targetWindowType === WINDOW_TYPES.CHAT) {
        sessionStorage.setItem(`chat_active_room_${targetId}`, sourceActiveRoom);
      }
      
      if (targetActiveRoom && sourceWindowType === WINDOW_TYPES.CHAT) {
        sessionStorage.setItem(`chat_active_room_${sourceId}`, targetActiveRoom);
      }
      
      // Get a list of all localStorage keys that might contain draft messages
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }
      
      // Filter keys related to each window
      const sourceKeys = allKeys.filter(key => key.startsWith(`chat_draft_${sourceId}_`));
      const targetKeys = allKeys.filter(key => key.startsWith(`chat_draft_${targetId}_`));
      
      console.log('Draft message keys before swap:', { sourceKeys, targetKeys });
      
      // Swap draft messages in localStorage
      if (targetWindowType === WINDOW_TYPES.CHAT) {
        sourceKeys.forEach(key => {
          const value = localStorage.getItem(key);
          const roomId = key.split('_')[3]; // Extract room ID from key format "chat_draft_nodeId_roomId"
          localStorage.setItem(`chat_draft_${targetId}_${roomId}`, value);
        });
      }
      
      if (sourceWindowType === WINDOW_TYPES.CHAT) {
        targetKeys.forEach(key => {
          const value = localStorage.getItem(key);
          const roomId = key.split('_')[3]; // Extract room ID from key format "chat_draft_nodeId_roomId"
          localStorage.setItem(`chat_draft_${sourceId}_${roomId}`, value);
        });
      }
      
      console.log('Successfully swapped chat window storage entries');
    }
    
    // Wait for IndexedDB operations to complete before continuing
    try {
      console.log('Starting IndexedDB state swap, waiting for completion...');
      
      // Import necessary functions to handle specific window types
      const { 
        getExplorerState, saveExplorerState,
        getTerminalState, saveTerminalState,
        getChatState, saveChatState,
        getCanvasState, saveCanvasState,
        getWindowState, saveWindowState,
        removeExplorerState, removeWindowState
      } = await import('../services/indexedDBService');
      
      console.log('Swapping IndexedDB states for window types:', sourceWindowType, targetWindowType);
      
      // Get current states from IndexedDB
      let sourceExplorerState = null;
      let targetExplorerState = null;
      let sourceTerminalState = null;
      let targetTerminalState = null;
      let sourceChatState = null;
      let targetChatState = null;
      let sourceCanvasState = null;
      let targetCanvasState = null;
      let sourceGenericState = null;
      let targetGenericState = null;
      
      // Get Explorer states if applicable
      if (sourceWindowType === WINDOW_TYPES.EXPLORER || targetWindowType === WINDOW_TYPES.EXPLORER) {
        sourceExplorerState = await getExplorerState(sourceId);
        targetExplorerState = await getExplorerState(targetId);
        console.log('Explorer states:', { sourceExplorerState, targetExplorerState });
      }
      
      // Get Terminal states if applicable
      if (sourceWindowType === WINDOW_TYPES.TERMINAL || targetWindowType === WINDOW_TYPES.TERMINAL) {
        sourceTerminalState = await getTerminalState(sourceId);
        targetTerminalState = await getTerminalState(targetId);
        console.log('Terminal states:', { sourceTerminalState, targetTerminalState });
      }
      
      // Get Chat states if applicable
      if (sourceWindowType === WINDOW_TYPES.CHAT || targetWindowType === WINDOW_TYPES.CHAT) {
        sourceChatState = await getChatState(sourceId);
        targetChatState = await getChatState(targetId);
        console.log('Chat states:', { sourceChatState, targetChatState });
      }
      
      // Get Canvas states if applicable
      if (sourceWindowType === WINDOW_TYPES.CANVAS || targetWindowType === WINDOW_TYPES.CANVAS) {
        sourceCanvasState = await getCanvasState(sourceId);
        targetCanvasState = await getCanvasState(targetId);
        console.log('Canvas states:', { sourceCanvasState, targetCanvasState });
      }
      
      // Get generic window states
      sourceGenericState = await getWindowState(sourceId);
      targetGenericState = await getWindowState(targetId);
      console.log('Generic window states:', { sourceGenericState, targetGenericState });
      
      // First, remove existing states to prevent any conflicts
      if (sourceWindowType === WINDOW_TYPES.EXPLORER) {
        await removeExplorerState(sourceId);
      }
      if (targetWindowType === WINDOW_TYPES.EXPLORER) {
        await removeExplorerState(targetId);
      }
      
      // Remove generic states
      await removeWindowState(sourceId);
      await removeWindowState(targetId);
      
      // For explorer windows, we need to handle special state swapping
      // We need to save a temporary state with the correct IDs
      const tempSourceId = `temp_${sourceId}`;
      const tempTargetId = `temp_${targetId}`;
      
      // Now swap the states in IndexedDB
      
      // Swap Explorer states
      if (sourceExplorerState && targetWindowType === WINDOW_TYPES.EXPLORER) {
        // First save source to temp
        await saveExplorerState({
          id: tempSourceId,
          content: sourceExplorerState.content
        });
      }
      
      if (targetExplorerState && sourceWindowType === WINDOW_TYPES.EXPLORER) {
        // First save target to temp
        await saveExplorerState({
          id: tempTargetId,
          content: targetExplorerState.content
        });
      }
      
      // Now move from temp to final locations
      if (sourceExplorerState && targetWindowType === WINDOW_TYPES.EXPLORER) {
        await saveExplorerState({
          id: targetId,
          content: sourceExplorerState.content
        });
        console.log('Saved source explorer state to target');
      }
      
      if (targetExplorerState && sourceWindowType === WINDOW_TYPES.EXPLORER) {
        await saveExplorerState({
          id: sourceId,
          content: targetExplorerState.content
        });
        console.log('Saved target explorer state to source');
      }
      
      // Swap Terminal states
      if (sourceTerminalState && targetWindowType === WINDOW_TYPES.TERMINAL) {
        await saveTerminalState({
          id: targetId,
          content: sourceTerminalState.content
        });
        console.log('Saved source terminal state to target');
      }
      
      if (targetTerminalState && sourceWindowType === WINDOW_TYPES.TERMINAL) {
        await saveTerminalState({
          id: sourceId,
          content: targetTerminalState.content
        });
        console.log('Saved target terminal state to source');
      }
      
      // Swap Chat states
      if (sourceChatState && targetWindowType === WINDOW_TYPES.CHAT) {
        await saveChatState({
          id: targetId,
          content: sourceChatState.content
        });
        console.log('Saved source chat state to target');
      }
      
      if (targetChatState && sourceWindowType === WINDOW_TYPES.CHAT) {
        await saveChatState({
          id: sourceId,
          content: targetChatState.content
        });
        console.log('Saved target chat state to source');
      }
      
      // Swap Canvas states
      if (sourceCanvasState && targetWindowType === WINDOW_TYPES.CANVAS) {
        await saveCanvasState({
          id: targetId,
          content: sourceCanvasState.content
        });
        console.log('Saved source canvas state to target');
      }
      
      if (targetCanvasState && sourceWindowType === WINDOW_TYPES.CANVAS) {
        await saveCanvasState({
          id: sourceId,
          content: targetCanvasState.content
        });
        console.log('Saved target canvas state to source');
      }
      
      // Swap generic window states
      if (sourceGenericState) {
        await saveWindowState({
          id: targetId,
          type: sourceWindowType,
          content: sourceGenericState.content
        });
        console.log('Saved source generic state to target');
      }
      
      if (targetGenericState) {
        await saveWindowState({
          id: sourceId,
          type: targetWindowType,
          content: targetGenericState.content
        });
        console.log('Saved target generic state to source');
      }
      
      console.log('Successfully swapped all IndexedDB states');
    } catch (error) {
      console.error('Error swapping IndexedDB states:', error);
    }

    // Update the in-memory workspace state
    updateWorkspace(currentWorkspaceIndex, workspace => {
      const newRoot = JSON.parse(JSON.stringify(workspace.root));
      
      // Find the nodes to swap again in the new root
      const sourceNode = findNodeById(newRoot, sourceId);
      const targetNode = findNodeById(newRoot, targetId);
      
      if (!sourceNode || !targetNode) {
        console.log('Could not find one or both nodes to swap in new root');
        return workspace;
      }
      
      // Swap the window types and states
      const tempWindowType = sourceNode.windowType;
      const tempState = sourceNode.state;
      
      sourceNode.windowType = targetNode.windowType;
      sourceNode.state = targetNode.state;
      
      targetNode.windowType = tempWindowType;
      targetNode.state = tempState;
      
      return { ...workspace, root: newRoot };
    });
    
    // Exit move mode after swapping
    setIsMoveMode(false);
    setMoveSourceWindowId(null);
    
    // Add small delay to ensure state changes propagate correctly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Window swap complete');
  }, [updateWorkspace, currentWorkspaceIndex, rootNode]);

  // Add direct keyboard event listener for move mode
  useEffect(() => {
    const handleMoveKeyDown = (e) => {
      // Handle move mode toggle
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        e.stopPropagation(); // Stop event propagation to prevent multiple handlers
        console.log('Move mode toggle pressed directly in useWindowManager');
        console.log('Current isMoveMode:', isMoveMode);
        
        // Toggle move mode
        setIsMoveMode(!isMoveMode);
        
        // Reset source window when toggling off
        if (isMoveMode) {
          setMoveSourceWindowId(null);
        }
      }
      
      // Handle move mode Enter key
      if (isMoveMode && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Enter key pressed in move mode');
        
        if (!moveSourceWindowId) {
          // First window selection
          console.log('Selected first window for move:', activeNodeId);
          setMoveSourceWindowId(activeNodeId);
        } else {
          // Second window selection - perform the swap
          console.log('Selected second window for move:', activeNodeId);
          swapWindows(moveSourceWindowId, activeNodeId);
        }
      }
    };
    
    // Add the event listener with capture: true to ensure it runs before other listeners
    window.addEventListener('keydown', handleMoveKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleMoveKeyDown, { capture: true });
  }, [isMoveMode, moveSourceWindowId, activeNodeId, setIsMoveMode, setMoveSourceWindowId, swapWindows]);

  // Debug checks for modes
  useEffect(() => {
    console.log('Resize mode:', isResizeMode);
  }, [isResizeMode]);

  useEffect(() => {
    console.log('Move mode:', isMoveMode);
    if (!isMoveMode) {
      setMoveSourceWindowId(null);
    }
  }, [isMoveMode]);

  // Function to update terminal state
  const updateTerminalState = useCallback((terminalId, newState) => {
    updateWorkspace(currentWorkspaceIndex, workspace => ({
      ...workspace,
      terminalStates: {
        ...workspace.terminalStates,
        [terminalId]: newState
      }
    }));
  }, [updateWorkspace, currentWorkspaceIndex]);

  return {
    rootNode,
    activeNodeId,
    setActiveNodeId,
    terminalStates,
    updateTerminalState,
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
    resizeActiveWindow,
    isMoveMode,
    setIsMoveMode,
    moveSourceWindowId,
    setMoveSourceWindowId,
    swapWindows
  };
};
