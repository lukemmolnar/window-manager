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

  const handleResizeMove = useCallback((e) => {
    if (!dragState) return;

    const { split, initialPos, initialRatio } = dragState;
    const delta = split.direction === 'horizontal' 
      ? (e.clientX - initialPos.x) / window.innerWidth 
      : (e.clientY - initialPos.y) / window.innerHeight;

    const newRatio = Math.max(0.1, Math.min(0.9, initialRatio + delta));
    split.splitRatio = newRatio;

    // Force a re-render
    setDragState(prev => ({ ...prev }));
  }, [dragState]);

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
  
      return (
        <div
          className={`absolute overflow-hidden border-2 ${
            isActive ? (isResizeMode ? 'border-yellow-500' : 'border-teal-500') : 'border-stone-600'
          }`}
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
      </div>
    </div>
  );
};

export default WindowManager;
