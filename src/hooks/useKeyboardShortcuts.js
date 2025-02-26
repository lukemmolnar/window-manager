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
  isResizeMode,
  setIsResizeMode,
  resizeActiveWindow
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle resize mode toggle
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        setIsResizeMode(!isResizeMode);
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
    resizeActiveWindow
  ]);
};
