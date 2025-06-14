import React, { useState, useCallback } from 'react';
import { WindowManager } from './components/WindowManager';
import { CommandBar } from './components/CommandBar';
import { EmptyState } from './components/EmptyState';
import { AuthScreen } from './components/auth';
import { useWindowManager } from './hooks/useWindowManager';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuth } from './context/AuthContext';
import { ActiveUsersProvider } from './context/ActiveUsersContext';
import { SocketProvider } from './context/SocketContext';
import { WINDOW_CONTENT, WINDOW_TYPES } from './utils/windowTypes';

/**
 * Main application component that composes our window management system.
 * This component is intentionally kept simple, delegating most functionality
 * to specialized components and hooks.
 */
function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  
  // State for tracking which windows are currently flashing
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
    }, 200);
  }, []);
  
  // Call all hooks at the top level, before any conditional returns
  const {
    rootNode,
    activeNodeId,
    setActiveNodeId,
    createNewWindow,
    splitWindow,
    closeWindow,
    transformWindow,
    handleCommand,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    hasActiveWindow,
    hasRootNode,
    currentWorkspaceIndex,
    switchWorkspace,
    isResizeMode,
    isMoveMode,
    setIsResizeMode,
    resizeActiveWindow,
    moveSourceWindowId
  } = useWindowManager({
    onFlashBorder: flashWindowBorder
  });

  // Set up keyboard shortcuts - always call this hook, even if we'll return early
  // But don't include move mode props to avoid conflicts with WindowManager
  useKeyboardShortcuts({
    onSplitVertical: () => splitWindow(activeNodeId, 'vertical'),
    onSplitHorizontal: () => splitWindow(activeNodeId, 'horizontal'),
    onClose: () => closeWindow(activeNodeId),
    createNewWindow,
    hasActiveWindow,
    hasRootNode,
    isResizeMode,
    isMoveMode,
    setIsResizeMode,
    resizeActiveWindow,
    activeNodeId
  });
  
  // If authentication is still loading, show a loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900">
        <div className="text-teal-500 text-2xl font-mono">Loading...</div>
      </div>
    );
  }
  
// If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Define component to render based on whether we have a root node
  const renderContent = () => {
    if (!rootNode) {
      return <EmptyState />;
    }

    // Render the window tree with all necessary props
    return (
      <WindowTreeRenderer
        node={rootNode}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
        transformWindow={transformWindow}
        onResizeStart={handleResizeStart}
        onResizeMove={handleResizeMove}
        onResizeEnd={handleResizeEnd}
        isResizeMode={isResizeMode} // Pass isResizeMode to WindowTreeRenderer
        isMoveMode={isMoveMode}
        moveSourceWindowId={moveSourceWindowId} // Pass moveSourceWindowId to WindowTreeRenderer
        flashingWindowIds={flashingWindowIds} // Pass flashingWindowIds to WindowTreeRenderer
      />
    );
  };

  return (
    <SocketProvider>
      <ActiveUsersProvider>
        <div className="w-full h-screen flex flex-col">
          {/* Global command bar with user info */}
          <CommandBar 
            onCommand={handleCommand}
            currentWorkspaceIndex={currentWorkspaceIndex}
            switchWorkspace={switchWorkspace}
            user={user}
            onLogout={logout}
          />
          
          {/* Main content area */}
          <div className="flex-1 relative">
            {renderContent()}
          </div>
        </div>
      </ActiveUsersProvider>
    </SocketProvider>
  );
}

/**
 * Renders the window tree recursively. This component is kept within App.jsx
 * since it's tightly coupled with the WindowManager's functionality.
 */
const WindowTreeRenderer = ({
  node,
  depth = 0,
  available = { x: 0, y: 0, width: 100, height: 100 },
  activeNodeId,
  setActiveNodeId,
  transformWindow,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  isResizeMode, // Add isResizeMode prop
  isMoveMode,
  moveSourceWindowId,
  flashingWindowIds
}) => {
  if (node.type === 'window') {
    const windowContent = WINDOW_CONTENT[node.windowType];
    
    // Check if window content exists (window type might have been removed)
    if (!windowContent) {
      console.warn(`Window type "${node.windowType}" is no longer supported`);
      return (
        <div
          className="absolute overflow-hidden border-1 border-red-500"
          style={{
            left: `${available.x}%`,
            top: `${available.y}%`,
            width: `${available.width}%`,
            height: `${available.height}%`,
          }}
          onClick={() => setActiveNodeId(node.id)}
        >
          <div className="flex h-full items-center justify-center bg-stone-800 text-red-400 p-4 text-center">
            <div>
              <p className="font-bold mb-2">Unsupported Window Type</p>
              <p className="text-sm">Window type "{node.windowType}" is no longer available</p>
              <button 
                className="mt-4 px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-xs text-teal-400"
                onClick={(e) => {
                  e.stopPropagation();
                  // Convert to terminal window
                  transformWindow(node.id, WINDOW_TYPES.TERMINAL);
                }}
              >
                Convert to Terminal
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    const Component = windowContent.component;
    const isActive = node.id === activeNodeId;
    // Check if this is the first selected window in move mode
    const isFirstSelectedWindow = isMoveMode && moveSourceWindowId === node.id;
    // Check if this window is currently flashing
    const isFlashing = flashingWindowIds.has(node.id);

    return (
      <div
        className={`absolute overflow-hidden border-1 ${
          isFlashing ? 'border-red-600' : 
          isFirstSelectedWindow 
            ? 'border-blue-300' 
            : isActive 
              ? isResizeMode 
                ? 'border-yellow-500'
                : isMoveMode
                  ? 'border-blue-500'
                  : 'border-teal-500'
              : 'border-stone-600'
        } $`}
        style={{
          left: `${available.x}%`,
          top: `${available.y}%`,
          width: `${available.width}%`,
          height: `${available.height}%`,
        }}
        onClick={() => setActiveNodeId(node.id)}
      >
        <Component
          key={`window-${node.id}-${node.windowType}`}
          isActive={isActive}
          nodeId={node.id}
          transformWindow={transformWindow}
        />
      </div>
    );
  }

  // Handle split nodes...
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
    <>
      <WindowTreeRenderer
        node={node.first}
        depth={depth + 1}
        available={firstDimensions}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
        transformWindow={transformWindow}
        onResizeStart={onResizeStart}
        onResizeMove={onResizeMove}
        onResizeEnd={onResizeEnd}
        isResizeMode={isResizeMode} // Pass down isResizeMode
        isMoveMode={isMoveMode} // Pass down isMoveMode
        moveSourceWindowId={moveSourceWindowId} // Pass down moveSourceWindowId
        flashingWindowIds={flashingWindowIds} // Pass down flashingWindowIds
      />
      
      <div
        className={`absolute z-10 ${
          node.direction === 'horizontal' 
            ? 'w-1 cursor-col-resize hover:bg-teal-500' 
            : 'h-1 cursor-row-resize hover:bg-teal-500'
        }`}
        style={{
          left: node.direction === 'horizontal' ? `${available.x + (available.width * node.splitRatio)}%` : `${available.x}%`,
          top: node.direction === 'horizontal' ? `${available.y}%` : `${available.y + (available.height * node.splitRatio)}%`,
          height: node.direction === 'horizontal' ? `${available.height}%` : '2px',
          width: node.direction === 'horizontal' ? '2px' : `${available.width}%`,
        }}
        onMouseDown={(e) => onResizeStart(e, node)}
      />
      
      <WindowTreeRenderer
        node={node.second}
        depth={depth + 1}
        available={secondDimensions}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
        transformWindow={transformWindow}
        onResizeStart={onResizeStart}
        onResizeMove={onResizeMove}
        onResizeEnd={onResizeEnd}
        isResizeMode={isResizeMode} // Pass down isResizeMode
        isMoveMode={isMoveMode} // Pass down isMoveMode
        moveSourceWindowId={moveSourceWindowId} // Pass down moveSourceWindowId
        flashingWindowIds={flashingWindowIds} // Pass down flashingWindowIds
      />
    </>
  );
};

export default App;
