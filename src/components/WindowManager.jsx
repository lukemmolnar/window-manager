import React, { useState, useCallback, useEffect } from 'react';
import { WINDOW_CONTENT } from '../utils/windowTypes';
import { getWindowBounds } from '../utils/windowUtils';
import { useWindowManager } from '../hooks/useWindowManager';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { CommandBar } from './CommandBar';
import EmptyState from './EmptyState';

export const WindowManager = ({ defaultLayout = null }) => {
  const {
    rootNode,
    activeNodeId,
    setActiveNodeId,
    terminalStates,
    updateTerminalState,
    splitWindow,
    createNewWindow,
    closeWindow,
    transformWindow,
    currentWorkspaceIndex,
    workspaceCount,
    switchWorkspace,
    isResizeMode,
    setIsResizeMode,
    resizeActiveWindow
  } = useWindowManager({ defaultLayout });

  const [dragState, setDragState] = useState(null);
  const [notification, setNotification] = useState(null);
  const [flashingWindowIds, setFlashingWindowIds] = useState(new Set());
  
  // Function to flash a window's border red
  const flashWindowBorder = useCallback((windowId) => {
    setFlashingWindowIds(prev => {
      const newSet = new Set(prev);
      newSet.add(windowId);
      return newSet;
    });
    
    // Remove the window from flashing state after 500ms
    setTimeout(() => {
      setFlashingWindowIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(windowId);
        return newSet;
      });
    }, 500);
  }, []);
  
  // Override window.alert to use our notification system
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      console.log('Alert:', message);
      
      // If the message is about splitting or creating windows, flash the active window border
      if (message.includes('split') || message.includes('create')) {
        if (activeNodeId) {
          flashWindowBorder(activeNodeId);
        }
      } else {
        // For other alerts, show the notification
        setNotification(message);
        setTimeout(() => setNotification(null), 3000); // Hide after 3 seconds
      }
    };
    
    return () => {
      window.alert = originalAlert;
    };
  }, [activeNodeId, flashWindowBorder]);

  // Add keyboard shortcuts
  useKeyboardShortcuts({
    onSplitVertical: () => splitWindow(activeNodeId, 'vertical'),
    onSplitHorizontal: () => splitWindow(activeNodeId, 'horizontal'),
    onClose: () => closeWindow(activeNodeId),
    createNewWindow,
    hasActiveWindow: Boolean(activeNodeId),
    hasRootNode: Boolean(rootNode),
    isResizeMode,
    setIsResizeMode: (mode) => setIsResizeMode(mode),
    resizeActiveWindow: (direction) => resizeActiveWindow(direction)
  });

  // Command handling for terminal
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

  // Resize handling
  const handleResizeStart = useCallback((e, split) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({
      split,
      initialPos: {
        x: e.clientX,
        y: e.clientY
      },
      initialRatio: split.splitRatio
    });
  }, []);

  // Helper function to convert percentage-based bounds to pixel dimensions
  const calculatePixelDimensions = useCallback((bounds) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    return {
      width: (bounds.width / 100) * windowWidth,
      height: (bounds.height / 100) * windowHeight
    };
  }, []);
  
  // Helper function to check if a window tree would have any windows smaller than the minimum size
  const hasWindowsBelowMinSize = useCallback((root) => {
    if (!root) return false;
    
    // Import constants directly here to avoid dependency issues
    const MIN_WINDOW_WIDTH_PX = 300;
    const MIN_WINDOW_HEIGHT_PX = 200;
    
    // Calculate the bounds of all windows
    const allWindows = getWindowBounds(root);
    
    // Check if any window would be smaller than the minimum size
    return allWindows.some(window => {
      const pixelDimensions = calculatePixelDimensions(window.bounds);
      const isTooSmall = pixelDimensions.width < MIN_WINDOW_WIDTH_PX || 
                         pixelDimensions.height < MIN_WINDOW_HEIGHT_PX;
      
      if (isTooSmall) {
        console.log('Window too small:', window.id);
        console.log('Dimensions:', pixelDimensions);
      }
      
      return isTooSmall;
    });
  }, [calculatePixelDimensions]);

  const handleResizeMove = useCallback((e) => {
    if (!dragState) return;

    const { split, initialPos, initialRatio } = dragState;
    const delta = split.direction === 'horizontal' 
      ? (e.clientX - initialPos.x) / window.innerWidth 
      : (e.clientY - initialPos.y) / window.innerHeight;

    const newRatio = Math.max(0.1, Math.min(0.9, initialRatio + delta));
    
    // Store the original ratio
    const originalRatio = split.splitRatio;
    
    // Apply the new ratio
    split.splitRatio = newRatio;
    
    // Check if this would result in windows that are too small, but don't block the resize
    if (hasWindowsBelowMinSize(rootNode)) {
      console.log('Windows are below minimum size, but resize is allowed');
    }
    
    // If we get here, the resize is allowed
    // Force a re-render
    setDragState(prev => ({ ...prev }));
  }, [dragState, rootNode, hasWindowsBelowMinSize, activeNodeId, flashWindowBorder]);

  const handleResizeEnd = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [dragState, handleResizeMove, handleResizeEnd]);

  // Window tree renderer
  const WindowTreeRenderer = ({ node, depth = 0, available = { x: 0, y: 0, width: 100, height: 100 } }) => {
    if (!node) return null;

    if (node.type === 'window') {
      const windowContent = WINDOW_CONTENT[node.windowType];
      if (!windowContent) {
        console.error('No window content found for type:', node.windowType);
        return null;
      }
      const Component = windowContent.component;
      const isActive = node.id === activeNodeId;
  
      // Check if this window is currently flashing
      const isFlashing = flashingWindowIds.has(node.id);
      
      return (
        <div
          className={`absolute overflow-hidden border-2 ${
            isFlashing ? 'border-red-600' : 
            isActive ? (isResizeMode ? 'border-yellow-500' : 'border-teal-500') : 'border-stone-600'
          } ${isFlashing ? 'animate-pulse' : ''}`}
          style={{
            left: `${available.x}%`,
            top: `${available.y}%`,
            width: `${available.width}%`,
            height: `${available.height}%`,
            transition: 'border-color 0.2s ease-in-out'
          }}
          onClick={() => setActiveNodeId(node.id)}
        >
          <Component 
            key={`window-${node.id}-${node.windowType}`}
            onCommand={handleCommand} 
            isActive={isActive}
            nodeState={node.state}
            nodeId={node.id}
            transformWindow={transformWindow}
            onStateChange={(newState) => {
              updateTerminalState(node.id, newState);
            }}
          />
        </div>
      );
    }

    // Calculate split dimensions
    let firstDimensions, secondDimensions;
    if (node.direction === 'horizontal') {
      firstDimensions = {
        x: available.x,
        y: available.y,
        width: available.width * node.splitRatio,
        height: available.height
      };
      secondDimensions = {
        x: available.x + (available.width * node.splitRatio),
        y: available.y,
        width: available.width * (1 - node.splitRatio),
        height: available.height
      };
    } else {
      firstDimensions = {
        x: available.x,
        y: available.y,
        width: available.width,
        height: available.height * node.splitRatio
      };
      secondDimensions = {
        x: available.x,
        y: available.y + (available.height * node.splitRatio),
        width: available.width,
        height: available.height * (1 - node.splitRatio)
      };
    }

    return (
      <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        <WindowTreeRenderer 
          node={node.first} 
          depth={depth + 1} 
          available={firstDimensions} 
        />
        <div
          className="absolute bg-stone-700 hover:bg-stone-500 transition-colors"
          style={{
            left: node.direction === 'horizontal' ? `${firstDimensions.width}%` : 0,
            top: node.direction === 'vertical' ? `${firstDimensions.height}%` : 0,
            width: node.direction === 'horizontal' ? '4px' : '100%',
            height: node.direction === 'vertical' ? '4px' : '100%',
            cursor: node.direction === 'horizontal' ? 'col-resize' : 'row-resize',
            pointerEvents: 'auto',
            zIndex: 10
          }}
          onMouseDown={(e) => handleResizeStart(e, node)}
        />
        <WindowTreeRenderer 
          node={node.second} 
          depth={depth + 1} 
          available={secondDimensions}
        />
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <CommandBar
        onCommand={handleCommand}
        currentWorkspaceIndex={currentWorkspaceIndex}
        switchWorkspace={switchWorkspace}
      />
      <div className="flex-1 relative bg-stone-900">
        {rootNode ? (
          <WindowTreeRenderer
            node={rootNode}
            terminalStates={terminalStates}
            updateTerminalState={updateTerminalState}
          />
        ) : (
          <EmptyState />
        )}
        
        {/* Notification system */}
        {notification && (
          <div 
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50"
            style={{ maxWidth: '80%' }}
          >
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};

export default WindowManager;
