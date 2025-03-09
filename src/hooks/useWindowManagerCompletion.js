// Function to swap two windows in the tree
  const swapWindows = useCallback((sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    console.log('Swapping windows:', sourceId, targetId);

    updateWorkspace(workspace => {
      const newRoot = JSON.parse(JSON.stringify(workspace.root));
      
      // Find the nodes to swap
      const sourceNode = findNodeById(newRoot, sourceId);
      const targetNode = findNodeById(newRoot, targetId);
      
      if (!sourceNode || !targetNode) {
        console.log('Could not find one or both nodes to swap');
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
  }, [updateWorkspace]);

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
    updateWorkspace(workspace => ({
      ...workspace,
      terminalStates: {
        ...workspace.terminalStates,
        [terminalId]: newState
      }
    }));
  }, [updateWorkspace]);

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
