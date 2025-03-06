import { useEffect } from 'react';
import { WINDOW_TYPES } from '../utils/windowTypes';

/**
 * A custom hook that manages keyboard shortcuts for window operations.
 * This hook centralizes all keyboard-related logic for the window manager.
 * 
 * @param {Object} handlers - Object containing callback functions for various window operations
 * @param {Function} handlers.onSplitVertical - Handler for vertical split command
 * @param {Function} handlers.onSplitHorizontal - Handler for horizontal split command
 * @param {Function} handlers.onClose - Handler for window close command
 * @param {Function} handlers.createNewWindow - Handler for creating new windows
 * @param {boolean} hasActiveWindow - Whether there is currently an active window
 * @param {boolean} hasRootNode - Whether there is a root node in the tree
 */
export const useKeyboardShortcuts = ({
  onSplitVertical,
  onSplitHorizontal,
  onClose,
  createNewWindow,
  hasActiveWindow,
  hasRootNode,
  isResizeMode = false,
  setIsResizeMode = () => console.warn('setIsResizeMode not provided'),
  resizeActiveWindow = () => console.warn('resizeActiveWindow not provided'),
  isMoveMode = false,
  setIsMoveMode = () => console.warn('setIsMoveMode not provided'),
  moveSourceWindowId = null,
  setMoveSourceWindowId = () => console.warn('setMoveSourceWindowId not provided'),
  swapWindows = () => console.warn('swapWindows not provided'),
  activeNodeId = null
}) => {
  // Log the props for debugging
  console.log('useKeyboardShortcuts props:', {
    isResizeMode,
    isMoveMode,
    moveSourceWindowId,
    activeNodeId,
    hasSetIsResizeMode: typeof setIsResizeMode === 'function',
    hasSetIsMoveMode: typeof setIsMoveMode === 'function',
    hasSetMoveSourceWindowId: typeof setMoveSourceWindowId === 'function',
    hasSwapWindows: typeof swapWindows === 'function'
  });
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle resize mode toggle
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        setIsResizeMode(!isResizeMode);
        // Exit move mode if it's active
        if (isMoveMode) {
          setIsMoveMode(false);
          setMoveSourceWindowId(null);
        }
        return;
      }

      // Handle move mode toggle
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        e.stopPropagation(); // Stop event propagation to prevent multiple handlers
        console.log('Move mode toggle pressed in useKeyboardShortcuts');
        console.log('setIsMoveMode type:', typeof setIsMoveMode);
        console.log('Current isMoveMode:', isMoveMode);
        console.log('Component ID:', Math.random()); // Add a random ID to identify which instance is handling the event
        
        // Check if setIsMoveMode is a function before calling it
        if (typeof setIsMoveMode === 'function') {
          // Toggle move mode with a direct call to ensure it works
          const newMoveMode = !isMoveMode;
          console.log('Setting move mode to:', newMoveMode);
          setIsMoveMode(newMoveMode);
          
          // Reset source window when toggling off
          if (isMoveMode && typeof setMoveSourceWindowId === 'function') {
            setMoveSourceWindowId(null);
          }
          
          // Exit resize mode if it's active
          if (isResizeMode && typeof setIsResizeMode === 'function') {
            setIsResizeMode(false);
          }
        } else {
          console.error('setIsMoveMode is not a function');
        }
        return;
      }

      // Handle move mode Enter key
      if (isMoveMode && e.key === 'Enter') {
        e.preventDefault();
        console.log('Enter key pressed in move mode');
        
        if (!moveSourceWindowId) {
          // First window selection
          console.log('Selected first window for move:', activeNodeId);
          if (typeof setMoveSourceWindowId === 'function') {
            setMoveSourceWindowId(activeNodeId);
          } else {
            console.error('setMoveSourceWindowId is not a function');
          }
        } else {
          // Second window selection - perform the swap
          console.log('Selected second window for move:', activeNodeId);
          if (typeof swapWindows === 'function') {
            swapWindows(moveSourceWindowId, activeNodeId);
          } else {
            console.error('swapWindows is not a function');
          }
        }
        return;
      }

      // Handle resize mode arrow keys
      if (isResizeMode && !e.ctrlKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            resizeActiveWindow('left');
            break;
          case 'ArrowRight':
            e.preventDefault();
            resizeActiveWindow('right');
            break;
          case 'ArrowUp':
            e.preventDefault();
            resizeActiveWindow('up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            resizeActiveWindow('down');
            break;
        }
        return;
      }

      // Handle other keyboard shortcuts...
      if (e.ctrlKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            hasActiveWindow ? onSplitVertical() : createNewWindow();
          } else {
            hasActiveWindow ? onSplitHorizontal() : createNewWindow();
          }
        } else if ((e.key === 'Backspace' || e.key === 'Delete') && hasActiveWindow && hasRootNode) {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSplitVertical,
    onSplitHorizontal,
    onClose,
    createNewWindow,
    hasActiveWindow,
    hasRootNode,
    isResizeMode,
    setIsResizeMode,
    resizeActiveWindow,
    isMoveMode,
    setIsMoveMode,
    moveSourceWindowId,
    setMoveSourceWindowId,
    swapWindows,
    activeNodeId
  ]);
};
